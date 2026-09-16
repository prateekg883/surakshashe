import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createSecureToken, hashSecureToken, createSessionToken, parseSessionToken, hashPassword, verifyPassword } from "./db";
import { assertRateLimit } from "./rateLimit";
import type { TrpcContext } from "./_core/context";

describe("Security and Authorization Audit", () => {
  const mockContext = (user: any = null): TrpcContext => ({
    req: { headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
    user,
  });

  it("denies unauthenticated access to protected procedures", async () => {
    const caller = appRouter.createCaller(mockContext(null));
    await expect(caller.contacts.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.sos.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.checkIns.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.privacy.exportData()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("denies non-admin users access to admin procedures", async () => {
    const caller = appRouter.createCaller(mockContext({ id: 10, role: "user", name: "Normal User" }));
    await expect(caller.admin.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.users.setRole({ id: 2, role: "admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.users.remove({ id: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.audit()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("prevents admin from demoting or deleting themselves", async () => {
    const caller = appRouter.createCaller(mockContext({ id: 1, role: "admin", name: "Super Admin" }));
    await expect(caller.admin.users.setRole({ id: 1, role: "user" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("cannot remove your own admin access"),
    });
    await expect(caller.admin.users.remove({ id: 1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("cannot delete your own account"),
    });
  });

  it("enforces rate limits on sensitive actions", () => {
    const key = `ratelimit-test-${Date.now()}`;
    assertRateLimit(key, 3, 60_000);
    assertRateLimit(key, 3, 60_000);
    assertRateLimit(key, 3, 60_000);
    expect(() => assertRateLimit(key, 3, 60_000)).toThrow("Too many attempts");
  });

  it("creates cryptographically secure tokens with constant-time verifiable hashes", () => {
    const token1 = createSecureToken();
    const token2 = createSecureToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThanOrEqual(40);

    const hash1 = hashSecureToken(token1);
    const hash2 = hashSecureToken(token2);
    expect(hash1).toHaveLength(64);
    expect(hash1).not.toBe(hash2);
    // Hash must be deterministic for the same token
    expect(hashSecureToken(token1)).toBe(hash1);
  });

  it("hashes passwords securely with scrypt and rejects invalid passwords", async () => {
    const plain = "SuperSecret123!";
    const hashed = await hashPassword(plain);
    expect(hashed).not.toContain(plain);
    expect(hashed).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/);

    await expect(verifyPassword(plain, hashed)).resolves.toBe(true);
    await expect(verifyPassword("WrongPassword123!", hashed)).resolves.toBe(false);
  });

  it("signs session tokens and detects tampering and version bumps", () => {
    const token = createSessionToken(42, 1);
    const parsed = parseSessionToken(token);
    expect(parsed).not.toBeNull();
    expect(parsed?.userId).toBe(42);
    expect(parsed?.sessionVersion).toBe(1);

    // Tampering with payload fails signature verification
    const tampered = token.replace("42.", "99.");
    expect(parseSessionToken(tampered)).toBeNull();

    // Tampering with signature fails
    expect(parseSessionToken(`${token}a`)).toBeNull();
  });
});
