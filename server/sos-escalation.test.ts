import { describe, expect, it } from "vitest";
import { retryAt } from "./deliveryQueueService";
import { mapTwilioStatus } from "./webhooks";
import { cleanPhoneNumber, formatWhatsAppAddress } from "./notificationService";

describe("SOS and Escalation Reliability", () => {
  it("calculates exponential retry backoff with minimum base delay", () => {
    const r1 = retryAt(1);
    const r2 = retryAt(2);
    const r3 = retryAt(3);

    expect(r1.getTime()).toBeGreaterThan(Date.now());
    expect(r2.getTime()).toBeGreaterThan(r1.getTime());
    expect(r3.getTime()).toBeGreaterThan(r2.getTime());

    // Difference between attempt 1 and 2 should be at least base delay
    const diff1 = (r2.getTime() - r1.getTime()) / 1000;
    expect(diff1).toBeGreaterThanOrEqual(10);
  });

  it("normalizes phone numbers to clean digits with leading plus", () => {
    expect(cleanPhoneNumber("+91 98765 43210")).toBe("+919876543210");
    expect(cleanPhoneNumber(" +1 (555) 123-4567 ")).toBe("+15551234567");
    expect(cleanPhoneNumber("9876543210")).toBe("9876543210");
  });

  it("normalizes WhatsApp addresses ensuring exactly one whatsapp: prefix", () => {
    expect(formatWhatsAppAddress("+919876543210")).toBe("whatsapp:+919876543210");
    expect(formatWhatsAppAddress("whatsapp:+919876543210")).toBe("whatsapp:+919876543210");
    expect(formatWhatsAppAddress("whatsapp: +1 (555) 000-1111")).toBe("whatsapp:+15550001111");
  });

  it("correctly maps Twilio provider statuses without false successes", () => {
    // Queued/accepted are sent, not delivered
    expect(mapTwilioStatus("queued")).toBe("sent");
    expect(mapTwilioStatus("sending")).toBe("sent");
    expect(mapTwilioStatus("sent")).toBe("sent");

    // Only delivered/read are marked delivered
    expect(mapTwilioStatus("delivered")).toBe("delivered");
    expect(mapTwilioStatus("read")).toBe("delivered");

    // Undelivered/failed are marked failed
    expect(mapTwilioStatus("undelivered")).toBe("failed");
    expect(mapTwilioStatus("failed")).toBe("failed");

    // Unknown statuses return null
    expect(mapTwilioStatus("unknown_status")).toBeNull();
  });
});
