import { describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, verifyPassword, verifySessionToken } from "./db";

describe("SurakshaShe app sessions", () => {
  it("hashes and verifies passwords without accepting the wrong password", async () => {
    const stored = await hashPassword("safe-pass-123");
    expect(stored).not.toContain("safe-pass-123");
    await expect(verifyPassword("safe-pass-123", stored)).resolves.toBe(true);
    await expect(verifyPassword("wrong-pass", stored)).resolves.toBe(false);
  });

  it("round-trips a signed session token and rejects tampering", () => {
    const token = createSessionToken(42);
    expect(verifySessionToken(token)).toBe(42);
    expect(verifySessionToken(`${token}tampered`)).toBeNull();
    expect(verifySessionToken("not-a-session")).toBeNull();
  });
});
