import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isEmailConfigured,
  isSmsConfigured,
  isWhatsAppConfigured,
  maskEmail,
  sendEmail,
  sendPasswordResetEmail,
} from "./notificationService";
import {
  createSecureToken,
  hashSecureToken,
  createSessionToken,
  parseSessionToken,
  hashPassword,
  verifyPassword,
} from "./db";
import { Webhook } from "svix";

describe("Password Reset & Real Provider Delivery Flow", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("1. Provider Configuration & Honest Failure Detection", () => {
    it("correctly identifies when email provider is unconfigured", () => {
      delete process.env.RESEND_API_KEY;
      delete process.env.RESEND_FROM_EMAIL;
      expect(isEmailConfigured()).toBe(false);
    });

    it("correctly identifies when email provider is configured", () => {
      process.env.RESEND_API_KEY = "re_test_123456";
      process.env.RESEND_FROM_EMAIL = "alerts@surakshashe.com";
      expect(isEmailConfigured()).toBe(true);
    });

    it("returns honest failure when sending email without configured credentials", async () => {
      delete process.env.RESEND_API_KEY;
      delete process.env.RESEND_FROM_EMAIL;

      const result = await sendEmail("victim@example.com", "Subject", "Body");
      expect(result.status).toBe("failed");
      expect(result.channel).toBe("email");
      expect(result.errorMessage).toContain("RESEND_API_KEY");
      expect(result.errorMessage).toContain("RESEND_FROM_EMAIL");
      expect(result.providerMessageId).toBeUndefined();
    });

    it("masks email addresses safely in logs without revealing user identity", () => {
      expect(maskEmail("prateek@example.com")).toBe("p***k@example.com");
      expect(maskEmail("ab@test.com")).toBe("a*@test.com");
      expect(maskEmail("invalid")).toBe("***");
    });
  });

  describe("2. Resend API Execution & Response Parsing", () => {
    it("successfully calls Resend API and captures provider message ID", async () => {
      process.env.RESEND_API_KEY = "re_live_test_key";
      process.env.RESEND_FROM_EMAIL = "alerts@surakshashe.com";

      const mockMessageId = "msg_01J8ABCXYZ123456789";
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: mockMessageId }),
      } as Response);

      const result = await sendPasswordResetEmail(
        "user@example.com",
        "https://surakshashe.com/reset-password/secure-random-token-abc"
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.resend.com/emails");
      expect(options.headers).toMatchObject({
        Authorization: "Bearer re_live_test_key",
        "Content-Type": "application/json",
      });

      const body = JSON.parse(options.body as string);
      expect(body.from).toBe("alerts@surakshashe.com");
      expect(body.to).toEqual(["user@example.com"]);
      expect(body.subject).toBe("Reset your SurakshaShe password");
      expect(body.text).toContain("https://surakshashe.com/reset-password/secure-random-token-abc");
      expect(body.html).toContain("Reset Password");

      expect(result.status).toBe("sent");
      expect(result.providerMessageId).toBe(mockMessageId);
      expect(result.errorMessage).toBeUndefined();
    });

    it("captures and surfaces Resend API rejection errors honestly", async () => {
      process.env.RESEND_API_KEY = "re_live_test_key";
      process.env.RESEND_FROM_EMAIL = "no-reply@unverified-domain.com";

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          statusCode: 403,
          name: "validation_error",
          message: "The domain unverified-domain.com is not verified. Please verify your domain in Resend.",
        }),
      } as Response);

      const result = await sendPasswordResetEmail(
        "user@example.com",
        "https://surakshashe.com/reset-password/token123"
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.status).toBe("failed");
      expect(result.providerMessageId).toBeUndefined();
      expect(result.errorMessage).toContain("The domain unverified-domain.com is not verified");
    });
  });

  describe("3. Cryptographic Token Lifecycle & Single-Use Security", () => {
    it("generates 32-byte secure random tokens and consistent HMAC hashes", () => {
      const token1 = createSecureToken();
      const token2 = createSecureToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThanOrEqual(40); // base64url length for 32 bytes is 43

      const hash1 = hashSecureToken(token1);
      const hash2 = hashSecureToken(token2);
      const hash1Repeat = hashSecureToken(token1);

      expect(hash1).not.toBe(hash2);
      expect(hash1).toBe(hash1Repeat);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it("enforces session token parsing, version validation, and tamper-resistance", () => {
      const userId = 42;
      const sessionVersion = 3;
      const token = createSessionToken(userId, sessionVersion);

      const parsed = parseSessionToken(token);
      expect(parsed).not.toBeNull();
      expect(parsed?.userId).toBe(42);
      expect(parsed?.sessionVersion).toBe(3);

      // Altering user ID or session version breaks HMAC signature
      const tampered = token.replace(".3.", ".4.");
      expect(parseSessionToken(tampered)).toBeNull();

      // Appending characters breaks signature
      expect(parseSessionToken(token + "x")).toBeNull();
    });

    it("verifies password hashing with scrypt and prevents plaintext leakage", async () => {
      const password = "SuperSecretPassword123!";
      const hash = await hashPassword(password);

      expect(hash).not.toContain(password);
      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword("WrongPassword123!", hash)).toBe(false);
      expect(await verifyPassword("", hash)).toBe(false);
    });
  });

  describe("4. Resend Webhook Verification & Event Handling", () => {
    it("verifies Svix webhook signatures for Resend callbacks", () => {
      const webhookSecret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
      const wh = new Webhook(webhookSecret);

      const payload = JSON.stringify({
        type: "email.delivered",
        created_at: new Date().toISOString(),
        data: {
          email_id: "msg_test_12345",
          from: "alerts@surakshashe.com",
          to: ["user@example.com"],
          subject: "Reset your password",
        },
      });

      const timestamp = new Date();
      const msgId = "msg_svix_test_01";
      const signature = wh.sign(msgId, timestamp, payload);

      // Verify signature succeeds with correct headers
      const verified = wh.verify(payload, {
        "svix-id": msgId,
        "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
        "svix-signature": signature,
      });

      expect((verified as any).type).toBe("email.delivered");
      expect((verified as any).data.email_id).toBe("msg_test_12345");
    });
  });
});
