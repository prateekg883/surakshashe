import { describe, expect, it } from "vitest";
import { computeTwilioSignature, safeEqual } from "./webhooks";
import { cleanPhoneNumber, formatWhatsAppAddress } from "./notificationService";

describe("Provider Integration Normalization and Security", () => {
  it("verifies safeEqual constant-time equality checks", () => {
    expect(safeEqual("abc123xyz", "abc123xyz")).toBe(true);
    expect(safeEqual("abc123xyz", "abc123xyw")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("computes reproducible Twilio HMAC-SHA1 signatures", () => {
    const secret = "test-auth-token-12345";
    const url = "https://example.com/api/webhooks/twilio/status";
    const params = { MessageSid: "SM12345", MessageStatus: "delivered" };

    const sig1 = computeTwilioSignature(secret, url, params);
    const sig2 = computeTwilioSignature(secret, url, params);
    expect(sig1).toBe(sig2);
    expect(sig1.length).toBeGreaterThan(10);

    // Changing any parameter changes the signature
    const sigDifferent = computeTwilioSignature(secret, url, { ...params, MessageStatus: "failed" });
    expect(sig1).not.toBe(sigDifferent);
  });

  it("normalizes diverse international phone number formats", () => {
    expect(cleanPhoneNumber("+91 (987) 654-3210")).toBe("+919876543210");
    expect(cleanPhoneNumber("+1-800-555-0199")).toBe("+18005550199");
    expect(cleanPhoneNumber("  +44 20 7946 0958  ")).toBe("+442079460958");
  });

  it("handles WhatsApp format prefixes without duplicating", () => {
    expect(formatWhatsAppAddress("+919876543210")).toBe("whatsapp:+919876543210");
    expect(formatWhatsAppAddress("whatsapp:+919876543210")).toBe("whatsapp:+919876543210");
    expect(formatWhatsAppAddress("WhatsApp:+919876543210")).toBe("whatsapp:+919876543210");
    expect(formatWhatsAppAddress("WHATSAPP:+15551234567")).toBe("whatsapp:+15551234567");
  });
});
