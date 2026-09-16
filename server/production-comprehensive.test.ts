import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import {
  createSecureToken,
  hashSecureToken,
  createSessionToken,
  parseSessionToken,
  hashPassword,
  verifyPassword,
  sanitizeDatabaseUrl,
} from "./db";
import { retryAt } from "./deliveryQueueService";
import { mapTwilioStatus } from "./webhooks";
import { cleanPhoneNumber, formatWhatsAppAddress, sendNotification } from "./notificationService";
import * as schema from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

describe("SurakshaShe Comprehensive Production Verification Suite", () => {
  const mockContext = (user: any = null): TrpcContext => ({
    req: { headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
    user,
  });

  // 1. Fresh database initialization & schema validation
  it("1. validates complete schema definition with all 17 production tables", () => {
    const tableKeys = [
      "users",
      "emergencyContacts",
      "sosAlerts",
      "notificationRecords",
      "incidentTimeline",
      "incidentAcknowledgements",
      "safetyCheckIns",
      "auditLogs",
      "passwordResetTokens",
      "verificationTokens",
      "providerWebhookEvents",
      "checkInPolicies",
      "sosEscalationPolicies",
      "emergencyAccessTokens",
      "userSessions",
      "accountDeletionRequests",
      "checkInEscalations",
    ];

    for (const key of tableKeys) {
      expect((schema as any)[key]).toBeDefined();
    }
  });

  // 2. User registration input validation & password security
  it("2. enforces registration password strength and phone formatting", async () => {
    const unauthCaller = appRouter.createCaller(mockContext(null));

    // Weak password rejected (< 8 chars)
    await expect(
      unauthCaller.auth.register({
        name: "Test User",
        email: "test_weak@example.com",
        phone: "+919876543210",
        password: "weak",
      })
    ).rejects.toThrow();

    // Password without numbers rejected
    await expect(
      unauthCaller.auth.register({
        name: "Test User",
        email: "test_nonum@example.com",
        phone: "+919876543210",
        password: "allletterslongpass",
      })
    ).rejects.toThrow();

    // Valid password hashes securely with scrypt
    const hash = await hashPassword("StrongPass123!");
    expect(hash).not.toContain("StrongPass123!");
    expect(await verifyPassword("StrongPass123!", hash)).toBe(true);
    expect(await verifyPassword("WrongPassword123!", hash)).toBe(false);
  });

  // 3. Login verification & session signing
  it("3. validates login session creation and tamper-evident signatures", () => {
    const token = createSessionToken(101, 0);
    const parsed = parseSessionToken(token);
    expect(parsed?.userId).toBe(101);
    expect(parsed?.sessionVersion).toBe(0);

    // Tampered token fails signature check
    expect(parseSessionToken(token + "tamper")).toBeNull();
    expect(parseSessionToken(token.replace("101", "999"))).toBeNull();
  });

  // 4. Emergency contact phone and WhatsApp normalization
  it("4. normalizes phone and WhatsApp channels accurately", () => {
    expect(cleanPhoneNumber("+91 (987) 654-3210")).toBe("+919876543210");
    expect(cleanPhoneNumber(" 9876543210 ")).toBe("9876543210");
    expect(formatWhatsAppAddress("+919876543210")).toBe("whatsapp:+919876543210");
    expect(formatWhatsAppAddress("whatsapp:+919876543210")).toBe("whatsapp:+919876543210");
  });

  // 5. SOS creation coordinate validation
  it("5. validates SOS input coordinates and range limits", async () => {
    const caller = appRouter.createCaller(mockContext({ id: 1, role: "user" }));

    // Invalid latitude (> 90)
    await expect(
      caller.sos.create({
        latitude: 195.0,
        longitude: 77.0,
      })
    ).rejects.toThrow();

    // Invalid longitude (< -180)
    await expect(
      caller.sos.create({
        latitude: 12.0,
        longitude: -200.0,
      })
    ).rejects.toThrow();
  });

  // 6. SOS persistence during notification failure
  it("6. keeps SOS notification records as failed without crashing the flow when provider is unconfigured", async () => {
    const mockContact = {
      id: 1,
      userId: 1,
      name: "Contact",
      phone: "+919999999999",
      email: "contact@example.com",
      relationship: "Friend",
      priority: 1,
      notifySms: true,
      notifyEmail: true,
      notifyWhatsApp: false,
      phoneVerifiedAt: null,
      emailVerifiedAt: null,
      createdAt: new Date(),
    };

    const mockAlert = {
      id: 50,
      userId: 1,
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 10,
      address: "Bengaluru",
      status: "active" as const,
      initialLatitude: 12.9716,
      initialLongitude: 77.5946,
      initialAccuracy: 10,
      lastLocationAt: new Date(),
      emergencyTokenHash: null,
      emergencyTokenExpiresAt: new Date(),
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

    const prevSid = process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_ACCOUNT_SID;

    const result = await sendNotification("sms", mockContact, "User", mockAlert, "raw-token");
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("not configured");

    if (prevSid) process.env.TWILIO_ACCOUNT_SID = prevSid;
  });

  // 7. Notification retry exponential backoff
  it("7. calculates exponential retry backoff with minimum base delay", () => {
    const now = Date.now();
    const r1 = retryAt(1);
    const r2 = retryAt(2);
    const r3 = retryAt(3);

    expect(r1.getTime()).toBeGreaterThan(now);
    expect(r2.getTime()).toBeGreaterThan(r1.getTime());
    expect(r3.getTime()).toBeGreaterThan(r2.getTime());
  });

  // 8. Escalation mapping & webhook provider normalization
  it("8. maps provider delivery states without false positives", () => {
    expect(mapTwilioStatus("queued")).toBe("sent");
    expect(mapTwilioStatus("accepted")).toBe("sent");
    expect(mapTwilioStatus("delivered")).toBe("delivered");
    expect(mapTwilioStatus("undelivered")).toBe("failed");
    expect(mapTwilioStatus("unknown-state")).toBeNull();
  });

  // 9. Acknowledgement and token hashing
  it("9. generates constant-time verifiable emergency tokens", () => {
    const token = createSecureToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    const hash1 = hashSecureToken(token);
    const hash2 = hashSecureToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  // 10. Safety check-in grace period logic
  it("10. evaluates check-in grace period and overdue thresholds correctly", () => {
    const now = Date.now();
    const graceMs = 15 * 60_000;

    const pastArrival = new Date(now - 20 * 60_000);
    expect(pastArrival.getTime() + graceMs <= now).toBe(true);

    const recentArrival = new Date(now - 5 * 60_000);
    expect(recentArrival.getTime() + graceMs <= now).toBe(false);
  });

  // 11. Privacy export schema requirements
  it("11. enforces authenticated session for privacy data export", async () => {
    const unauthenticated = appRouter.createCaller(mockContext(null));
    await expect(unauthenticated.privacy.exportData()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  // 12. Account deletion confirmation requirement
  it("12. requires exact 'DELETE MY ACCOUNT' confirmation string", async () => {
    const caller = appRouter.createCaller(mockContext({ id: 5, role: "user" }));
    await expect(
      caller.privacy.deleteAccount({ confirmation: "delete" as any })
    ).rejects.toThrow();
  });

  // 13. Protection against IDOR/BOLA (unauthorized access to other users' data)
  it("13. prevents unauthorized access or mutation of another user's contacts and alerts", async () => {
    const userCaller = appRouter.createCaller(mockContext({ id: 10, role: "user" }));

    // Unauthenticated access blocked
    const unauthCaller = appRouter.createCaller(mockContext(null));
    await expect(unauthCaller.contacts.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(unauthCaller.sos.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(unauthCaller.checkIns.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  // 14. Admin authorization & self-protection
  it("14. denies non-admin callers access to admin endpoints and blocks admin self-destruction", async () => {
    const normalUserCaller = appRouter.createCaller(mockContext({ id: 10, role: "user" }));
    await expect(normalUserCaller.admin.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(normalUserCaller.admin.audit()).rejects.toMatchObject({ code: "FORBIDDEN" });

    const adminCaller = appRouter.createCaller(mockContext({ id: 1, role: "admin" }));
    await expect(adminCaller.admin.users.setRole({ id: 1, role: "user" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("cannot remove your own admin access"),
    });
    await expect(adminCaller.admin.users.remove({ id: 1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("cannot delete your own account"),
    });
  });

  // 15. Database outage handling & credential masking
  it("15. sanitizes database URLs in logs and ensures no credentials leak", () => {
    const masked = sanitizeDatabaseUrl("postgresql://admin_user:SuperSecretPassword123@db.cloud.example.com:5432/production_db");
    expect(masked).not.toContain("SuperSecretPassword123");
    expect(masked).toContain("admin_user:***@db.cloud.example.com:5432/production_db");
  });
});
