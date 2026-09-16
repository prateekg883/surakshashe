import { describe, expect, it } from "vitest";
import { createSecureToken, hashSecureToken } from "./db";
import { assertRateLimit } from "./rateLimit";
import { sendNotification } from "./notificationService";
import { mapTwilioStatus } from "./webhooks";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const contact = {
  id: 1,
  userId: 1,
  name: "Trusted Person",
  phone: "+919999999999",
  email: "trusted@example.com",
  relationship: "Friend",
  priority: 1,
  notifySms: true,
  notifyEmail: true,
  notifyWhatsApp: false,
  phoneVerifiedAt: null,
  emailVerifiedAt: null,
  createdAt: new Date(),
};

const alert = {
  id: 1,
  userId: 1,
  latitude: 12.9716,
  longitude: 77.5946,
  accuracy: 20,
  address: null,
  status: "active" as const,
  initialLatitude: 12.9716,
  initialLongitude: 77.5946,
  initialAccuracy: 20,
  lastLocationAt: new Date(),
  emergencyTokenHash: null,
  emergencyTokenExpiresAt: new Date(Date.now() + 60_000),
  emergencyTokenRevokedAt: null,
  notificationStatus: "pending" as const,
  activatedAt: new Date(),
  createdAt: new Date(),
  resolvedAt: null,
  resolutionNote: null,
  safeMarkedAt: null,
  escalationLevel: 1,
  nextEscalationAt: null,
};

describe("production safety foundations", () => {
  const context = (user: any = null): TrpcContext => ({ req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"], user });

  it("creates non-empty tokens and one-way stable hashes", () => {
    const token = createSecureToken();
    expect(token.length).toBeGreaterThan(32);
    expect(hashSecureToken(token)).toHaveLength(64);
    expect(hashSecureToken(token)).toBe(hashSecureToken(token));
    expect(hashSecureToken(token)).not.toBe(hashSecureToken(createSecureToken()));
  });

  it("blocks authentication abuse after the configured limit", () => {
    const key = `test-${Date.now()}`;
    assertRateLimit(key, 2, 60_000);
    assertRateLimit(key, 2, 60_000);
    expect(() => assertRateLimit(key, 2, 60_000)).toThrow("Too many attempts");
  });

  it("reports an unconfigured SMS provider as failed", async () => {
    const previous = process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_ACCOUNT_SID;
    const result = await sendNotification("sms", contact, "Test user", alert, "safe-token");
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("not configured");
    if (previous) process.env.TWILIO_ACCOUNT_SID = previous;
  });

  it("normalizes provider delivery states without treating queued as delivered", () => {
    expect(mapTwilioStatus("queued")).toBe("sent");
    expect(mapTwilioStatus("delivered")).toBe("delivered");
    expect(mapTwilioStatus("undelivered")).toBe("failed");
    expect(mapTwilioStatus("unknown-provider-state")).toBeNull();
  });

  it("blocks protected and admin procedures for the wrong caller", async () => {
    const unauthenticated = appRouter.createCaller(context());
    await expect(unauthenticated.contacts.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const normalUser = appRouter.createCaller(context({ id: 99, role: "user" }));
    await expect(normalUser.admin.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
