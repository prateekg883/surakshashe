import { eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import * as schema from "../drizzle/schema";
import { InsertUser, User, users, userSessions } from "../drizzle/schema";
import { ENV } from "./_core/env";

export type AppDb = PostgresJsDatabase<typeof schema> & { $client: postgres.Sql };

let _sql: postgres.Sql | null = null;
let _db: AppDb | null = null;
const scrypt = promisify(nodeScrypt);

// A locally generated development secret avoids a predictable fallback while
// retaining stable sessions for the lifetime of a local server/test process.
const developmentSessionSecret = randomBytes(48).toString("base64url");

function sessionSigningSecret() {
  if (ENV.cookieSecret) return ENV.cookieSecret;
  if (ENV.isProduction) throw new Error("JWT_SECRET is required in production.");
  return developmentSessionSecret;
}

export function sanitizeDatabaseUrl(url: string | undefined): string {
  if (!url) return "<not configured>";
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
  }
}

export async function getDb(): Promise<AppDb | null> {
  const url = process.env.DATABASE_URL || ENV.databaseUrl;
  if (!url) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[Database] DATABASE_URL is not set. Database operations will be unavailable.");
    }
    return null;
  }

  if (!_db || !_sql) {
    try {
      const sanitized = sanitizeDatabaseUrl(url);
      console.log(`[Database] Initializing Postgres connection for ${sanitized}...`);
      
      const poolSize = parseInt(process.env.DB_POOL_SIZE || "10", 10);
      const max = Number.isFinite(poolSize) && poolSize > 0 ? poolSize : 10;
      const forceSsl = process.env.DATABASE_SSL === "true" || process.env.DATABASE_SSL === "1";

      _sql = postgres(url, { max, ssl: forceSsl ? "require" : false });
      _db = drizzle(_sql, { schema }) as unknown as AppDb;
      
      console.log("[Database] Postgres and Drizzle ORM initialized successfully.");
    } catch (error: any) {
      console.error("[Database] Failed to initialize connection pool:", error);
      _sql = null;
      _db = null;
    }
  }
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_sql) {
    try {
      await _sql.end();
    } catch {
      // Ignore errors
    }
    _sql = null;
    _db = null;
  }
}

export async function checkDatabaseHealth(): Promise<{ ok: boolean; message: string; tableCount?: number }> {
  try {
    const db = await getDb();
    if (!db || !_sql) {
      return { ok: false, message: "DATABASE_URL is missing or connection failed." };
    }
    await _sql`SELECT 1 AS health`;
    const tables = await _sql`SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'`;
    const count = Number(tables[0]?.count || 0);
    return { ok: true, message: `Connected successfully (${count} tables found).`, tableCount: count };
  } catch (error: any) {
    console.error("[Database Health] Check failed:", error);
    return { ok: false, message: `Database error: ${error.message}` };
  }
}

export async function requireUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  } catch (error: any) {
    console.error("[Database] requireUserById query error:", { code: error?.code, id });
    return undefined;
  }
}

export async function getUserByAuthId(authId: string) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(users).where(eq(users.authId, authId)).limit(1);
    return result[0];
  } catch (error: any) {
    console.error("[Database] getUserByAuthId query error:", { code: error?.code });
    return undefined;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0];
  } catch (error: any) {
    console.error("[Database] getUserByOpenId query error:", { code: error?.code });
    return undefined;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    return result[0];
  } catch (error: any) {
    console.error("[Database] getUserByEmail query error:", { code: error?.code });
    return undefined;
  }
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(users).where(eq(users.phone, phone.trim())).limit(1);
    return result[0];
  } catch (error: any) {
    console.error("[Database] getUserByPhone query error:", { code: error?.code });
    return undefined;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod", "phone", "passwordHash"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password.trim(), salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, storedKey] = storedHash.split(":");
  if (!salt || !storedKey) return false;
  const derived = (await scrypt(password.trim(), salt, 64)) as Buffer;
  const expected = Buffer.from(storedKey, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export type SessionTokenDetails = {
  userId: number;
  sessionVersion: number;
  sessionId: string;
  issuedAt: number;
};

export function createSessionToken(userId: number, sessionVersion = 0, sessionId = createSecureToken()) {
  const payload = `${userId}.${Date.now()}.${sessionVersion}.${sessionId}`;
  const secret = sessionSigningSecret();
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function parseSessionToken(token: string | undefined): SessionTokenDetails | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [userId, issuedAt, sessionVersion, sessionId, signature] = parts;
  const payload = `${userId}.${issuedAt}.${sessionVersion}.${sessionId}`;
  const secret = sessionSigningSecret();
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const parsedId = Number(userId);
  const issued = Number(issuedAt);
  const parsedVersion = Number(sessionVersion);
  if (!Number.isInteger(parsedId) || !Number.isFinite(issued) || !Number.isInteger(parsedVersion) || sessionId.length < 32) return null;
  if (Date.now() - issued > 30 * 24 * 60 * 60 * 1000) return null;
  return { userId: parsedId, issuedAt: issued, sessionVersion: parsedVersion, sessionId };
}

export function verifySessionToken(token: string | undefined) {
  return parseSessionToken(token)?.userId ?? null;
}

export function sessionCookieName() {
  return "suraksha_session";
}

export function createSecureToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSecureToken(token: string) {
  const secret = sessionSigningSecret();
  return createHmac("sha256", secret).update(token).digest("hex");
}

export async function createUserSession(user: Pick<User, "id" | "sessionVersion">) {
  const sessionId = createSecureToken();
  const token = createSessionToken(user.id, user.sessionVersion, sessionId);
  const db = await getDb();
  if (!db) throw new Error("The safety database is temporarily unavailable.");
  await db.insert(userSessions).values({
    userId: user.id,
    sessionIdHash: hashSecureToken(sessionId),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  return token;
}

export async function isUserSessionValid(user: Pick<User, "id" | "sessionVersion">, token: SessionTokenDetails) {
  if (token.userId !== user.id || token.sessionVersion !== user.sessionVersion) return false;
  const db = await getDb();
  if (!db) return false;
  try {
    const session = (await db.select().from(userSessions).where(eq(userSessions.sessionIdHash, hashSecureToken(token.sessionId))).limit(1))[0];
    if (!session || session.userId !== user.id || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return false;
    await db.update(userSessions).set({ lastSeenAt: new Date() }).where(eq(userSessions.id, session.id));
    return true;
  } catch (error: any) {
    console.error("[Database] isUserSessionValid query error:", { code: error?.code });
    return false;
  }
}

export async function revokeUserSession(sessionId: string) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.sessionIdHash, hashSecureToken(sessionId)));
  } catch (error: any) {
    console.error("[Database] revokeUserSession query error:", { code: error?.code });
  }
}

export async function revokeAllUserSessions(userId: number) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.userId, userId));
  } catch (error: any) {
    console.error("[Database] revokeAllUserSessions query error:", { code: error?.code });
  }
}
