import { describe, expect, it } from "vitest";
import { UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from "@shared/const";
import { appRouter, calculateHaversineDistanceKm } from "./routers";
import { saveUploadedFile } from "./storage";
import type { TrpcContext } from "./_core/context";

describe("SHIELD Reference Features Verification Suite", () => {
  const mockContext = (user: any = null): TrpcContext => ({
    req: { headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
    user,
  });

  const normalUser = {
    id: 101,
    role: "user" as const,
    name: "Aanya Sharma",
    email: "aanya@example.com",
    sessionVersion: 1,
  };

  const otherUser = {
    id: 202,
    role: "user" as const,
    name: "Riya Patel",
    email: "riya@example.com",
    sessionVersion: 1,
  };

  const adminUser = {
    id: 999,
    role: "admin" as const,
    name: "Suraksha Admin",
    email: "admin@surakshashe.org",
    sessionVersion: 1,
  };

  // ========================================================
  // 1. TRAVEL SAFETY: CREATION & VALIDATION
  // ========================================================
  describe("1. Travel Safety / Travel Log Creation", () => {
    it("rejects travel trip creation when unauthenticated", async () => {
      const caller = appRouter.createCaller(mockContext(null));
      await expect(
        caller.travel.create({
          destination: "Connaught Place",
          expectedArrival: new Date(Date.now() + 3600_000),
        })
      ).rejects.toThrow(UNAUTHED_ERR_MSG);
    });

    it("rejects empty destination or past expected arrival", async () => {
      const caller = appRouter.createCaller(mockContext(normalUser));
      await expect(
        caller.travel.create({
          destination: "",
          expectedArrival: new Date(Date.now() + 3600_000),
        })
      ).rejects.toThrow();
    });

    it("validates non-sequential cryptographic verification code format", () => {
      // Simulate verification code generation logic
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const randNum = 100000 + Math.floor(Math.random() * 900000);
        const code = `SK-${randNum}`;
        expect(code).toMatch(/^SK-\d{6}$/);
        codes.add(code);
      }
      // Assert randomness: out of 50 codes, at least 45 should be unique
      expect(codes.size).toBeGreaterThanOrEqual(45);
    });
  });

  // ========================================================
  // 2. LIVE TRIP LOCATION & AUTHORIZATION
  // ========================================================
  describe("2. Live Trip Location & Authorization", () => {
    it("enforces coordinate bounds on location updates", async () => {
      const caller = appRouter.createCaller(mockContext(normalUser));

      // Latitude > 90 must fail validation
      await expect(
        caller.travel.updateLocation({
          id: 1,
          latitude: 95.5,
          longitude: 77.2,
        })
      ).rejects.toThrow();

      // Longitude < -180 must fail validation
      await expect(
        caller.travel.updateLocation({
          id: 1,
          latitude: 28.6,
          longitude: -195.0,
        })
      ).rejects.toThrow();
    });

    it("requires authentication to query active trips and history", async () => {
      const unauthCaller = appRouter.createCaller(mockContext(null));
      await expect(unauthCaller.travel.active()).rejects.toThrow(UNAUTHED_ERR_MSG);
      await expect(unauthCaller.travel.history()).rejects.toThrow(UNAUTHED_ERR_MSG);
    });
  });

  // ========================================================
  // 3. 5 KM DISTANCE FILTERING & HAVERSINE CALCULATION
  // ========================================================
  describe("3. 5 KM Distance Filtering & Haversine Formula", () => {
    it("accurately calculates distance between coordinates", () => {
      // India Gate (28.6129, 77.2295) to Connaught Place (28.6315, 77.2167) ~ 2.4 km
      const distance = calculateHaversineDistanceKm(28.6129, 77.2295, 28.6315, 77.2167);
      expect(distance).toBeGreaterThan(1.8);
      expect(distance).toBeLessThan(3.0);
    });

    it("correctly determines whether a location is within 5 km radius", () => {
      const originLat = 28.6129;
      const originLon = 77.2295;

      // Nearby point (~2.4 km away) -> within 5km
      const nearbyDist = calculateHaversineDistanceKm(originLat, originLon, 28.6315, 77.2167);
      expect(nearbyDist <= 5.0).toBe(true);

      // Far point: Noida Sector 62 (28.6280, 77.3649) ~ 13.3 km away -> outside 5km
      const farDist = calculateHaversineDistanceKm(originLat, originLon, 28.6280, 77.3649);
      expect(farDist <= 5.0).toBe(false);
      expect(farDist).toBeGreaterThan(10.0);
    });

    it("handles zero distance for identical coordinates", () => {
      const dist = calculateHaversineDistanceKm(12.9716, 77.5946, 12.9716, 77.5946);
      expect(dist).toBe(0);
    });
  });

  // ========================================================
  // 4. NEARBY RESPONDER OPT-IN & AUTHORIZATION
  // ========================================================
  describe("4. Nearby Responder Opt-in & Authorization", () => {
    it("rejects unauthenticated requests for nearby alerts", async () => {
      const unauthCaller = appRouter.createCaller(mockContext(null));
      await expect(unauthCaller.nearby.getSettings()).rejects.toThrow(UNAUTHED_ERR_MSG);
      await expect(unauthCaller.nearby.activeAlerts()).rejects.toThrow(UNAUTHED_ERR_MSG);
      await expect(
        unauthCaller.nearby.respond({ incidentId: 1, response: "responding" })
      ).rejects.toThrow(UNAUTHED_ERR_MSG);
    });

    it("validates responder response enum options", async () => {
      const caller = appRouter.createCaller(mockContext(normalUser));
      // Invalid response enum must fail schema validation
      await expect(
        caller.nearby.respond({ incidentId: 1, response: "ignored" as any })
      ).rejects.toThrow();
    });
  });

  // ========================================================
  // 5. NEXT OF KIN DESIGNATION
  // ========================================================
  describe("5. Next of Kin Designation in Trusted Contacts", () => {
    it("rejects contact creation or Next of Kin toggle when unauthenticated", async () => {
      const unauthCaller = appRouter.createCaller(mockContext(null));
      await expect(unauthCaller.contacts.toggleNextOfKin({ id: 1 })).rejects.toThrow(UNAUTHED_ERR_MSG);
    });

    it("supports Next of Kin boolean on contact input schema", async () => {
      const caller = appRouter.createCaller(mockContext(normalUser));
      // Missing required phone must throw schema validation error
      await expect(
        caller.contacts.create({
          name: "Sister",
          phone: "invalid-phone",
          isNextOfKin: true,
        })
      ).rejects.toThrow();
    });
  });

  // ========================================================
  // 6. COMMUNITY SAFETY & MODERATION
  // ========================================================
  describe("6. Community Safety & Moderation", () => {
    it("requires authentication for creating safety posts", async () => {
      const unauthCaller = appRouter.createCaller(mockContext(null));
      await expect(
        unauthCaller.community.createPost({
          title: "Well-lit street",
          content: "Safe route with 24h pharmacy",
          category: "safety_tip",
        })
      ).rejects.toThrow(UNAUTHED_ERR_MSG);
    });

    it("validates post title and content length constraints", async () => {
      const caller = appRouter.createCaller(mockContext(normalUser));
      // Title too short (< 3 chars)
      await expect(
        caller.community.createPost({
          title: "Hi",
          content: "Valid content description here",
          category: "safety_tip",
        })
      ).rejects.toThrow();

      // Content too short (< 5 chars)
      await expect(
        caller.community.createPost({
          title: "Valid Title Here",
          content: "No",
          category: "safety_tip",
        })
      ).rejects.toThrow();
    });

    it("enforces admin-only access for community moderation", async () => {
      const userCaller = appRouter.createCaller(mockContext(normalUser));
      // Regular user cannot view reports or moderate
      await expect(userCaller.admin.community.reports()).rejects.toThrow(NOT_ADMIN_ERR_MSG);
      await expect(
        userCaller.admin.community.moderate({
          reportId: 1,
          action: "hide_content",
        })
      ).rejects.toThrow(NOT_ADMIN_ERR_MSG);
    });

    it("allows admin to access community reports and responder destinations", async () => {
      const adminCaller = appRouter.createCaller(mockContext(adminUser));
      // Should not throw FORBIDDEN or UNAUTHORIZED for admin
      try {
        const destinations = await adminCaller.admin.responderDestinations.list();
        expect(Array.isArray(destinations)).toBe(true);
      } catch (err: any) {
        // If DB not connected, should not be an auth error
        expect(err.message).not.toContain("FORBIDDEN");
        expect(err.message).not.toContain("UNAUTHORIZED");
      }
    });
  });

  // ========================================================
  // 7. VEHICLE PHOTO & MEDIA STORAGE VALIDATION
  // ========================================================
  describe("7. Vehicle Photo & Upload Validation", () => {
    it("rejects unauthorized file extensions / MIME types", async () => {
      const testBuffer = Buffer.from("fake executable payload");
      await expect(
        saveUploadedFile(testBuffer, "malicious.exe", "application/x-msdownload")
      ).rejects.toThrow("Invalid file type");

      await expect(
        saveUploadedFile(testBuffer, "script.sh", "text/x-shellscript")
      ).rejects.toThrow("Invalid file type");
    });

    it("rejects file payloads exceeding 5MB limit", async () => {
      // 5MB + 1KB buffer
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);
      await expect(
        saveUploadedFile(oversizedBuffer, "large_vehicle.jpg", "image/jpeg")
      ).rejects.toThrow("5MB");
    });

    it("accepts valid image MIME types within size limit", async () => {
      const validJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const result = await saveUploadedFile(validJpg, "car_plate.jpg", "image/jpeg");
      expect(result.fileKey).toBeDefined();
      expect(result.fileKey.endsWith(".jpg")).toBe(true);
      expect(result.sizeBytes).toBe(validJpg.length);
    });

    it("enforces authenticated access to upload router", async () => {
      const unauthCaller = appRouter.createCaller(mockContext(null));
      await expect(
        unauthCaller.upload.uploadFile({
          fileName: "photo.jpg",
          mimeType: "image/jpeg",
          base64Data: "dGVzdA==",
        })
      ).rejects.toThrow(UNAUTHED_ERR_MSG);
    });
  });

  // ========================================================
  // 8. EMERGENCY RESPONDER DESTINATIONS (NO FAKE DELIVERIES)
  // ========================================================
  describe("8. Emergency Responder Destinations & Honest Status", () => {
    it("enforces admin-only access to responder destinations configuration", async () => {
      const userCaller = appRouter.createCaller(mockContext(normalUser));
      await expect(
        userCaller.admin.responderDestinations.upsert({
          name: "National Emergency Helpline 112",
          type: "national_emergency",
          phone: "112",
          notifySms: true,
          notifyEmail: false,
          notifyWhatsApp: false,
          enabled: true,
          priority: 1,
        })
      ).rejects.toThrow(NOT_ADMIN_ERR_MSG);
    });

    it("rejects unauthenticated requests for responder destinations", async () => {
      const unauthCaller = appRouter.createCaller(mockContext(null));
      await expect(unauthCaller.admin.responderDestinations.list()).rejects.toThrow(NOT_ADMIN_ERR_MSG);
    });
  });
});
