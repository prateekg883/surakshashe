var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/app.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accountDeletionRequests: () => accountDeletionRequests,
  auditLogs: () => auditLogs,
  channelEnum: () => channelEnum,
  checkInEscalationStatusEnum: () => checkInEscalationStatusEnum,
  checkInEscalations: () => checkInEscalations,
  checkInPolicies: () => checkInPolicies,
  checkInStatusEnum: () => checkInStatusEnum,
  emergencyAccessTokens: () => emergencyAccessTokens,
  emergencyContacts: () => emergencyContacts,
  fileContextEnum: () => fileContextEnum,
  fileUploads: () => fileUploads,
  incidentAcknowledgements: () => incidentAcknowledgements,
  incidentTimeline: () => incidentTimeline,
  notificationRecords: () => notificationRecords,
  notificationStatusEnum: () => notificationStatusEnum,
  passwordResetTokens: () => passwordResetTokens,
  personOfConcernReports: () => personOfConcernReports,
  providerWebhookEvents: () => providerWebhookEvents,
  responseEnum: () => responseEnum,
  roleEnum: () => roleEnum,
  safetyCheckIns: () => safetyCheckIns,
  sosAlerts: () => sosAlerts,
  sosEscalationPolicies: () => sosEscalationPolicies,
  statusEnum: () => statusEnum,
  tokenKindEnum: () => tokenKindEnum,
  userSessions: () => userSessions,
  users: () => users,
  vehicleReports: () => vehicleReports,
  verificationTokens: () => verificationTokens
});
import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var statusEnum = pgEnum("status", ["active", "acknowledged", "resolved", "cancelled", "failed"]);
var notificationStatusEnum = pgEnum("notificationStatus", ["pending", "sent", "delivered", "failed"]);
var channelEnum = pgEnum("channel", ["sms", "email", "whatsapp"]);
var responseEnum = pgEnum("response", ["acknowledged", "responding"]);
var checkInStatusEnum = pgEnum("checkInStatus", ["active", "safe", "expired", "cancelled"]);
var tokenKindEnum = pgEnum("kind", ["email", "phone"]);
var checkInEscalationStatusEnum = pgEnum("checkInEscalationStatus", ["pending", "sent", "failed"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  authId: varchar("authId", { length: 64 }).unique(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  phone: varchar("phone", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  // Incrementing this invalidates every password session after a reset or
  // administrative security action without relying on an in-memory store.
  sessionVersion: integer("sessionVersion").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var emergencyContacts = pgTable("emergencyContacts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }),
  relationship: varchar("relationship", { length: 120 }),
  priority: integer("priority").default(1).notNull(),
  notifySms: boolean("notifySms").default(true).notNull(),
  notifyEmail: boolean("notifyEmail").default(true).notNull(),
  notifyWhatsApp: boolean("notifyWhatsApp").default(false).notNull(),
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var sosAlerts = pgTable("sosAlerts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  accuracy: doublePrecision("accuracy"),
  address: text("address"),
  status: statusEnum("status").default("active").notNull(),
  initialLatitude: doublePrecision("initialLatitude"),
  initialLongitude: doublePrecision("initialLongitude"),
  initialAccuracy: doublePrecision("initialAccuracy"),
  lastLocationAt: timestamp("lastLocationAt"),
  emergencyTokenHash: varchar("emergencyTokenHash", { length: 128 }),
  emergencyTokenExpiresAt: timestamp("emergencyTokenExpiresAt"),
  emergencyTokenRevokedAt: timestamp("emergencyTokenRevokedAt"),
  notificationStatus: notificationStatusEnum("notificationStatus").default("pending").notNull(),
  activatedAt: timestamp("activatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolutionNote: text("resolutionNote"),
  safeMarkedAt: timestamp("safeMarkedAt"),
  escalationLevel: integer("escalationLevel").default(1).notNull(),
  nextEscalationAt: timestamp("nextEscalationAt")
});
var notificationRecords = pgTable("notificationRecords", {
  id: serial("id").primaryKey(),
  incidentId: integer("incidentId").notNull(),
  contactId: integer("contactId").notNull(),
  channel: channelEnum("channel").notNull(),
  status: notificationStatusEnum("status").default("pending").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  idempotencyKey: varchar("idempotencyKey", { length: 191 }).notNull().unique(),
  recipientVerified: boolean("recipientVerified").default(false).notNull(),
  attemptCount: integer("attemptCount").default(0).notNull(),
  maxAttempts: integer("maxAttempts").default(5).notNull(),
  nextAttemptAt: timestamp("nextAttemptAt").defaultNow().notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  processingAt: timestamp("processingAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var incidentTimeline = pgTable("incidentTimeline", {
  id: serial("id").primaryKey(),
  incidentId: integer("incidentId").notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var incidentAcknowledgements = pgTable("incidentAcknowledgements", {
  id: serial("id").primaryKey(),
  incidentId: integer("incidentId").notNull(),
  contactId: integer("contactId").notNull(),
  response: responseEnum("response").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var safetyCheckIns = pgTable("safetyCheckIns", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  message: varchar("message", { length: 240 }).notNull(),
  expectedArrival: timestamp("expectedArrival").notNull(),
  reminderAt: timestamp("reminderAt"),
  status: checkInStatusEnum("status").default("active").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actorUserId"),
  action: varchar("action", { length: 120 }).notNull(),
  targetType: varchar("targetType", { length: 80 }),
  targetId: integer("targetId"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var passwordResetTokens = pgTable("passwordResetTokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var verificationTokens = pgTable("verificationTokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  contactId: integer("contactId"),
  kind: tokenKindEnum("kind").notNull(),
  destination: varchar("destination", { length: 320 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var providerWebhookEvents = pgTable("providerWebhookEvents", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 40 }).notNull(),
  rawEventType: varchar("rawEventType", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var checkInPolicies = pgTable("checkInPolicies", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  escalationEnabled: boolean("escalationEnabled").default(false).notNull(),
  graceMinutes: integer("graceMinutes").default(15).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var sosEscalationPolicies = pgTable("sosEscalationPolicies", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  acknowledgementWaitMinutes: integer("acknowledgementWaitMinutes").default(5).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var emergencyAccessTokens = pgTable("emergencyAccessTokens", {
  id: serial("id").primaryKey(),
  incidentId: integer("incidentId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var userSessions = pgTable("userSessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  sessionIdHash: varchar("sessionIdHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var accountDeletionRequests = pgTable("accountDeletionRequests", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt")
});
var checkInEscalations = pgTable("checkInEscalations", {
  id: serial("id").primaryKey(),
  checkInId: integer("checkInId").notNull(),
  contactId: integer("contactId").notNull(),
  channel: channelEnum("channel").notNull(),
  status: checkInEscalationStatusEnum("status").default("pending").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  errorMessage: text("errorMessage"),
  idempotencyKey: varchar("idempotencyKey", { length: 191 }).notNull().unique(),
  attemptCount: integer("attemptCount").default(0).notNull(),
  maxAttempts: integer("maxAttempts").default(5).notNull(),
  nextAttemptAt: timestamp("nextAttemptAt").defaultNow().notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  processingAt: timestamp("processingAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var fileContextEnum = pgEnum("fileContext", ["profile", "evidence", "suspect", "vehicle", "other"]);
var fileUploads = pgTable("fileUploads", {
  id: serial("id").primaryKey(),
  uploadedByUserId: integer("uploadedByUserId").notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull().unique(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: integer("sizeBytes").notNull(),
  context: fileContextEnum("context").default("other").notNull(),
  contextId: integer("contextId"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var personOfConcernReports = pgTable("personOfConcernReports", {
  id: serial("id").primaryKey(),
  reportedByUserId: integer("reportedByUserId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  gender: varchar("gender", { length: 40 }),
  ageApprox: varchar("ageApprox", { length: 40 }),
  notes: text("notes"),
  lastKnownLocation: text("lastKnownLocation"),
  observedAt: timestamp("observedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var vehicleReports = pgTable("vehicleReports", {
  id: serial("id").primaryKey(),
  reportedByUserId: integer("reportedByUserId").notNull(),
  registrationNumber: varchar("registrationNumber", { length: 40 }),
  normalizedRegistration: varchar("normalizedRegistration", { length: 40 }),
  type: varchar("type", { length: 80 }),
  makeModel: varchar("makeModel", { length: 120 }),
  color: varchar("color", { length: 40 }),
  description: text("description"),
  relatedIncidentId: integer("relatedIncidentId"),
  relatedPersonId: integer("relatedPersonId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || "suraksha-media"
};

// server/db.ts
var _sql = null;
var _db = null;
var scrypt = promisify(nodeScrypt);
var developmentSessionSecret = randomBytes(48).toString("base64url");
function sessionSigningSecret() {
  if (ENV.cookieSecret) return ENV.cookieSecret;
  if (ENV.isProduction) throw new Error("JWT_SECRET is required in production.");
  return developmentSessionSecret;
}
function sanitizeDatabaseUrl(url) {
  if (!url) return "<not configured>";
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
  }
}
async function getDb() {
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
      _db = drizzle(_sql, { schema: schema_exports });
      console.log("[Database] Postgres and Drizzle ORM initialized successfully.");
    } catch (error) {
      console.error("[Database] Failed to initialize connection pool:", error);
      _sql = null;
      _db = null;
    }
  }
  return _db;
}
async function checkDatabaseHealth() {
  try {
    const db = await getDb();
    if (!db || !_sql) {
      return { ok: false, message: "DATABASE_URL is missing or connection failed." };
    }
    await _sql`SELECT 1 AS health`;
    const tables = await _sql`SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'`;
    const count = Number(tables[0]?.count || 0);
    return { ok: true, message: `Connected successfully (${count} tables found).`, tableCount: count };
  } catch (error) {
    console.error("[Database Health] Check failed:", error);
    return { ok: false, message: `Database error: ${error.message}` };
  }
}
async function requireUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] requireUserById query error:", { code: error?.code, id });
    return void 0;
  }
}
async function getUserByAuthId(authId) {
  const db = await getDb();
  if (!db) return void 0;
  try {
    const result = await db.select().from(users).where(eq(users.authId, authId)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] getUserByAuthId query error:", { code: error?.code });
    return void 0;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  try {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] getUserByOpenId query error:", { code: error?.code });
    return void 0;
  }
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  try {
    const result = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] getUserByEmail query error:", { code: error?.code });
    return void 0;
  }
}
async function getUserByPhone(phone) {
  const db = await getDb();
  if (!db) return void 0;
  try {
    const result = await db.select().from(users).where(eq(users.phone, phone.trim())).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] getUserByPhone query error:", { code: error?.code });
    return void 0;
  }
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod", "phone", "passwordHash"];
  for (const field of textFields) {
    const value = user[field];
    if (value !== void 0) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= /* @__PURE__ */ new Date();
  updateSet.lastSignedIn ??= /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password.trim(), salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}
async function verifyPassword(password, storedHash) {
  const [salt, storedKey] = storedHash.split(":");
  if (!salt || !storedKey) return false;
  const derived = await scrypt(password.trim(), salt, 64);
  const expected = Buffer.from(storedKey, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
function createSessionToken(userId, sessionVersion = 0, sessionId = createSecureToken()) {
  const payload = `${userId}.${Date.now()}.${sessionVersion}.${sessionId}`;
  const secret = sessionSigningSecret();
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}
function parseSessionToken(token) {
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
  if (Date.now() - issued > 30 * 24 * 60 * 60 * 1e3) return null;
  return { userId: parsedId, issuedAt: issued, sessionVersion: parsedVersion, sessionId };
}
function createSecureToken() {
  return randomBytes(32).toString("base64url");
}
function hashSecureToken(token) {
  const secret = sessionSigningSecret();
  return createHmac("sha256", secret).update(token).digest("hex");
}
async function createUserSession(user) {
  const sessionId = createSecureToken();
  const token = createSessionToken(user.id, user.sessionVersion, sessionId);
  const db = await getDb();
  if (!db) throw new Error("The safety database is temporarily unavailable.");
  await db.insert(userSessions).values({
    userId: user.id,
    sessionIdHash: hashSecureToken(sessionId),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3)
  });
  return token;
}
async function isUserSessionValid(user, token) {
  if (token.userId !== user.id || token.sessionVersion !== user.sessionVersion) return false;
  const db = await getDb();
  if (!db) return false;
  try {
    const session = (await db.select().from(userSessions).where(eq(userSessions.sessionIdHash, hashSecureToken(token.sessionId))).limit(1))[0];
    if (!session || session.userId !== user.id || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return false;
    await db.update(userSessions).set({ lastSeenAt: /* @__PURE__ */ new Date() }).where(eq(userSessions.id, session.id));
    return true;
  } catch (error) {
    console.error("[Database] isUserSessionValid query error:", { code: error?.code });
    return false;
  }
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: ENV.isProduction || isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/local-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { and as and3, desc, eq as eq4, inArray, isNull, like, or } from "drizzle-orm";
import { randomBytes as randomBytes2 } from "node:crypto";
import { z as z2 } from "zod";

// server/supabase.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
var supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file."
    );
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
async function getSupabaseUser(accessToken) {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(accessToken);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}
function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}
function getSupabaseAnonClient() {
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file."
    );
  }
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// server/storage.ts
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
var UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
var STORAGE_BUCKET = ENV.supabaseStorageBucket || "suraksha-media";
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error("[Storage] Failed to create upload directory", err);
  }
}
ensureUploadDir();
var ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
var MAX_FILE_SIZE = 5 * 1024 * 1024;
async function saveUploadedFile(fileData, originalName, mimeType) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid file type: ${mimeType}. Only JPG, PNG, and WEBP are allowed.` });
  }
  if (fileData.length > MAX_FILE_SIZE) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File exceeds the 5MB size limit." });
  }
  const fileKey = crypto.randomBytes(32).toString("hex") + path.extname(originalName).toLowerCase();
  if (isSupabaseConfigured()) {
    try {
      const admin = getSupabaseAdmin();
      const { error } = await admin.storage.from(STORAGE_BUCKET).upload(fileKey, fileData, {
        contentType: mimeType,
        upsert: true
      });
      if (error) {
        console.warn("[Storage] Supabase Storage upload error (falling back to local):", error.message);
      }
    } catch (sbErr) {
      console.warn("[Storage] Supabase Storage error:", sbErr);
    }
  }
  const filePath = path.join(UPLOAD_DIR, fileKey);
  await fs.writeFile(filePath, fileData);
  return { fileKey, sizeBytes: fileData.length };
}
async function getUploadedFile(fileKey) {
  const safeFileKey = path.basename(fileKey);
  if (isSupabaseConfigured()) {
    try {
      const admin = getSupabaseAdmin();
      const { data, error } = await admin.storage.from(STORAGE_BUCKET).download(safeFileKey);
      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer();
        let mimeType = data.type || "application/octet-stream";
        if (safeFileKey.endsWith(".jpg") || safeFileKey.endsWith(".jpeg")) mimeType = "image/jpeg";
        if (safeFileKey.endsWith(".png")) mimeType = "image/png";
        if (safeFileKey.endsWith(".webp")) mimeType = "image/webp";
        return { fileData: Buffer.from(arrayBuffer), mimeType };
      }
    } catch (sbErr) {
      console.warn("[Storage] Supabase download error, checking local disk:", sbErr);
    }
  }
  const filePath = path.join(UPLOAD_DIR, safeFileKey);
  try {
    const fileData = await fs.readFile(filePath);
    let mimeType = "application/octet-stream";
    if (safeFileKey.endsWith(".jpg") || safeFileKey.endsWith(".jpeg")) mimeType = "image/jpeg";
    if (safeFileKey.endsWith(".png")) mimeType = "image/png";
    if (safeFileKey.endsWith(".webp")) mimeType = "image/webp";
    return { fileData, mimeType };
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

// server/notificationService.ts
var appBaseUrl = () => process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL || "";
function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}
function maskEmail(email) {
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [name, domain] = parts;
  const maskedName = name.length <= 2 ? `${name[0] || "*"}*` : `${name[0]}***${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}
function incidentMessage(userName, alert, emergencyLink) {
  return `EMERGENCY SOS from ${userName}. Location: ${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}. ${alert.address || "Open the secure emergency link for the live incident."} ${emergencyLink}`;
}
async function sendEmail(to, subject, text2, idempotencyKey, html) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    const missing = [];
    if (!apiKey) missing.push("RESEND_API_KEY");
    if (!from) missing.push("RESEND_FROM_EMAIL");
    const errorMsg = `Email provider is not configured (${missing.join(", ")} missing in environment).`;
    console.warn(`[Resend Email] Cannot send email to ${maskEmail(to)}: ${errorMsg}`);
    return { channel: "email", status: "failed", errorMessage: errorMsg };
  }
  console.log(`[Resend Email] Dispatching email to ${maskEmail(to)} with subject "${subject}" from "${from}"...`);
  try {
    const payload = {
      from,
      to: [to],
      subject,
      text: text2,
      ...html ? { html } : {}
    };
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15e3)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorDetail = body?.message || body?.error || `HTTP ${response.status}`;
      console.error(`[Resend Email] Provider rejected request for ${maskEmail(to)} (HTTP ${response.status}): ${errorDetail}`);
      return {
        channel: "email",
        status: "failed",
        errorMessage: `Email provider error (${response.status}): ${errorDetail}`,
        retryable: response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500
      };
    }
    if (typeof body.id !== "string" || body.id.length < 1) {
      console.error(`[Resend Email] Provider accepted request but returned no message identifier:`, body);
      return { channel: "email", status: "failed", errorMessage: "Email provider returned no message identifier." };
    }
    console.log(`[Resend Email] Message accepted by Resend provider. Message ID: ${body.id}`);
    return { channel: "email", status: "sent", providerMessageId: body.id };
  } catch (error) {
    const errMessage = error?.message || "Request timeout or network error";
    console.error(`[Resend Email] Network request failed for ${maskEmail(to)}: ${errMessage}`);
    return { channel: "email", status: "failed", errorMessage: `Email provider request failed: ${errMessage}`, retryable: true };
  }
}
async function sendPasswordResetEmail(to, resetLink) {
  const plainText = `We received a password reset request for your SurakshaShe account.

Reset your password here: ${resetLink}

This link expires in 30 minutes. If you did not request it, you can ignore this email.`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset your SurakshaShe password</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fbf8f7; margin: 0; padding: 40px 20px;">
  <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="display: inline-block; background-color: #e11d48; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 16px; margin-bottom: 24px;">
      SurakshaShe
    </div>
    <h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0;">Reset your password</h1>
    <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0;">
      We received a request to reset your password for your SurakshaShe safety account. Click the button below to choose a new password:
    </p>
    <div style="margin: 32px 0;">
      <a href="${resetLink}" style="background-color: #e11d48; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color: #64748b; font-size: 13px; line-height: 20px; margin: 0 0 16px 0;">
      This link will expire in <strong>30 minutes</strong>. If you did not request this password reset, please ignore this email; your account remains secure.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0; word-break: break-all;">
      If the button above does not work, copy and paste this link into your browser:<br/>
      <a href="${resetLink}" style="color: #e11d48;">${resetLink}</a>
    </p>
  </div>
</body>
</html>`;
  return sendEmail(to, "Reset your SurakshaShe password", plainText, void 0, html);
}
function cleanPhoneNumber(phone) {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}
function formatWhatsAppAddress(address) {
  const trimmed = address.trim();
  const withoutPrefix = trimmed.replace(/^whatsapp:/i, "").trim();
  const normalizedPhone = cleanPhoneNumber(withoutPrefix);
  return `whatsapp:${normalizedPhone}`;
}
async function sendTwilio(to, body, channel, idempotencyKey) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = channel === "whatsapp" ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_FROM_NUMBER;
  if (!sid || !auth || !from) {
    const missing = [];
    if (!sid) missing.push("TWILIO_ACCOUNT_SID");
    if (!auth) missing.push("TWILIO_AUTH_TOKEN");
    if (!from) missing.push(channel === "whatsapp" ? "TWILIO_WHATSAPP_FROM" : "TWILIO_FROM_NUMBER");
    const errorMsg = `${channel === "sms" ? "SMS" : "WhatsApp"} provider is not configured (${missing.join(", ")} missing in environment).`;
    console.warn(`[Twilio ${channel.toUpperCase()}] Cannot send notification: ${errorMsg}`);
    return { channel, status: "failed", errorMessage: errorMsg };
  }
  try {
    const formattedTo = channel === "whatsapp" ? formatWhatsAppAddress(to) : cleanPhoneNumber(to);
    const formattedFrom = channel === "whatsapp" ? formatWhatsAppAddress(from) : cleanPhoneNumber(from);
    const payload = new URLSearchParams({ To: formattedTo, From: formattedFrom, Body: body });
    const callbackBase = process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL;
    if (callbackBase) payload.set("StatusCallback", `${callbackBase.replace(/\/$/, "")}/api/webhooks/twilio/status`);
    console.log(`[Twilio ${channel.toUpperCase()}] Dispatching message via Twilio API from ${formattedFrom}...`);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}
      },
      body: payload,
      signal: AbortSignal.timeout(15e3)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = result?.message || `HTTP ${response.status}${result?.code ? ` (Code ${result.code})` : ""}`;
      console.error(`[Twilio ${channel.toUpperCase()}] Provider rejected request (HTTP ${response.status}): ${errorMsg}`);
      return {
        channel,
        status: "failed",
        errorMessage: `Twilio provider error: ${errorMsg}`,
        retryable: response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500
      };
    }
    if (typeof result.sid !== "string" || result.sid.length < 1) {
      console.error(`[Twilio ${channel.toUpperCase()}] Provider returned invalid SID:`, result);
      return { channel, status: "failed", errorMessage: "Twilio provider returned no message identifier." };
    }
    console.log(`[Twilio ${channel.toUpperCase()}] Message accepted by Twilio. SID: ${result.sid}`);
    return { channel, status: "sent", providerMessageId: result.sid };
  } catch (error) {
    const errMessage = error?.message || "Request timeout or network error";
    console.error(`[Twilio ${channel.toUpperCase()}] Network request failed: ${errMessage}`);
    return { channel, status: "failed", errorMessage: `Twilio request failed: ${errMessage}`, retryable: true };
  }
}
async function sendVerificationNotification(kind, destination, code) {
  if (kind === "email") {
    const plainText = `Your SurakshaShe verification code is ${code}. It expires in 15 minutes.`;
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verify your SurakshaShe contact</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fbf8f7; margin: 0; padding: 40px 20px;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px;">
    <div style="display: inline-block; background-color: #e11d48; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px; margin-bottom: 20px;">
      SurakshaShe Verification
    </div>
    <h2 style="color: #0f172a; margin: 0 0 12px 0;">Verify your contact details</h2>
    <p style="color: #475569; font-size: 14px; line-height: 22px;">Use the code below to verify your email address on SurakshaShe:</p>
    <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
      <span style="font-family: monospace; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #0f172a;">${code}</span>
    </div>
    <p style="color: #64748b; font-size: 12px;">This code will expire in <strong>15 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
  </div>
</body>
</html>`;
    return sendEmail(destination, "Verify your SurakshaShe contact", plainText, void 0, html);
  }
  return sendTwilio(destination, `Your SurakshaShe verification code is ${code}. It expires in 15 minutes.`, "sms", `verification/${kind}/${destination}/${code}`);
}
async function sendContactMessage(channel, contact, subject, body, idempotencyKey) {
  if (channel === "email") {
    if (!contact.email) return { channel, status: "failed", errorMessage: "Contact has no email address." };
    return sendEmail(contact.email, subject, body, idempotencyKey);
  }
  if (!contact.phone) return { channel, status: "failed", errorMessage: "Contact has no phone number." };
  return sendTwilio(contact.phone, body, channel, idempotencyKey);
}
async function sendNotification(channel, contact, userName, alert, emergencyToken, idempotencyKey) {
  const link = appBaseUrl() ? `${appBaseUrl()}/emergency/${encodeURIComponent(emergencyToken)}` : "Open the SurakshaShe emergency link from the alert.";
  const body = incidentMessage(userName, alert, link);
  if (channel === "email") {
    if (!contact.email) return { channel, status: "failed", errorMessage: "Contact has no email address." };
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>EMERGENCY SOS ALERT</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fff1f2; margin: 0; padding: 30px 15px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 2px solid #e11d48; border-radius: 16px; padding: 28px; box-shadow: 0 10px 15px -3px rgba(225,29,72,0.1);">
    <div style="background-color: #e11d48; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 16px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
      EMERGENCY SOS ALERT
    </div>
    <h2 style="color: #0f172a; margin: 20px 0 10px 0; font-size: 20px;">Emergency from ${userName}</h2>
    <p style="color: #334155; font-size: 15px; line-height: 24px; margin-bottom: 20px;">
      ${userName} has activated an emergency SOS alert and listed you as a trusted contact.
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;"><strong>Location:</strong> ${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}</p>
      ${alert.address ? `<p style="margin: 0; font-size: 14px; color: #475569;"><strong>Address:</strong> ${alert.address}</p>` : ""}
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${link}" style="background-color: #e11d48; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block;">
        Open Live Incident Dashboard
      </a>
    </div>
    <p style="color: #64748b; font-size: 12px; line-height: 18px; margin: 0;">
      If you are in immediate danger or suspect a serious crime, contact local emergency services (112 / 100 / 1091) immediately.
    </p>
  </div>
</body>
</html>`;
    return sendEmail(contact.email, `EMERGENCY SOS from ${userName}`, body, idempotencyKey, html);
  }
  if (!contact.phone) return { channel, status: "failed", errorMessage: "Contact has no phone number." };
  return sendTwilio(contact.phone, body, channel, idempotencyKey);
}

// server/rateLimit.ts
var buckets = /* @__PURE__ */ new Map();
function pruneExpired(now) {
  if (buckets.size < 1e4) return;
  buckets.forEach((entry, key) => {
    if (entry.resetAt <= now) buckets.delete(key);
  });
}
function assertRateLimit(key, limit, windowMs) {
  const now = Date.now();
  pruneExpired(now);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1e3));
    throw new Error(`Too many attempts. Try again in ${retryAfter} seconds.`);
  }
}
function requestIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  return req.ip || "unknown";
}

// server/checkInService.ts
import { and as and2, eq as eq3 } from "drizzle-orm";

// server/deliveryQueueService.ts
import { and, eq as eq2, gt, lte } from "drizzle-orm";
var SESSION_LINK_TTL_MS = 24 * 60 * 60 * 1e3;
var LOCK_MS = 2 * 60 * 1e3;
var DEFAULT_WAIT_MINUTES = 5;
var workerRunning = false;
function resultAffectedRows(result) {
  const candidate = Array.isArray(result) ? result[0] : result;
  return typeof candidate?.affectedRows === "number" ? candidate.affectedRows : 0;
}
function channelsForContact(contact) {
  const channels = [];
  if (contact.notifySms && contact.phone) channels.push("sms");
  if (contact.notifyEmail && contact.email) channels.push("email");
  if (contact.notifyWhatsApp && contact.phone) channels.push("whatsapp");
  return channels;
}
function verifiedForChannel(contact, channel) {
  return channel === "email" ? Boolean(contact.emailVerifiedAt) : Boolean(contact.phoneVerifiedAt);
}
function retryAt(attempt) {
  const configured = Number(process.env.NOTIFICATION_RETRY_BASE_SECONDS || 15);
  const baseSeconds = Number.isFinite(configured) ? Math.max(5, configured) : 15;
  const delaySeconds = Math.min(15 * 60, baseSeconds * 2 ** Math.max(0, attempt - 1));
  return new Date(Date.now() + delaySeconds * 1e3);
}
async function addTimeline(db, incidentId, eventType, message) {
  await db.insert(incidentTimeline).values({ incidentId, eventType, message });
}
async function queueSosPriority(db, incidentId, userId, priority) {
  const contacts = await db.select().from(emergencyContacts).where(and(eq2(emergencyContacts.userId, userId), eq2(emergencyContacts.priority, priority)));
  let queued = 0;
  for (const contact of contacts) {
    for (const channel of channelsForContact(contact)) {
      const idempotencyKey = `sos/${incidentId}/contact/${contact.id}/${channel}`;
      await db.insert(notificationRecords).values({
        incidentId,
        contactId: contact.id,
        channel,
        idempotencyKey,
        recipientVerified: verifiedForChannel(contact, channel),
        status: "pending",
        nextAttemptAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({ target: notificationRecords.id, set: { idempotencyKey } });
      queued += 1;
    }
  }
  return queued;
}
async function queueCheckInContact(db, checkInId, contact, channel) {
  const idempotencyKey = `check-in/${checkInId}/contact/${contact.id}/${channel}`;
  await db.insert(checkInEscalations).values({
    checkInId,
    contactId: contact.id,
    channel,
    idempotencyKey,
    status: "pending",
    nextAttemptAt: /* @__PURE__ */ new Date()
  }).onConflictDoUpdate({ target: notificationRecords.id, set: { idempotencyKey } });
}
async function recalculateIncident(db, incidentId) {
  const records = await db.select().from(notificationRecords).where(eq2(notificationRecords.incidentId, incidentId));
  if (!records.length) {
    await db.update(sosAlerts).set({ notificationStatus: "failed" }).where(eq2(sosAlerts.id, incidentId));
    return;
  }
  const status = records.every((record) => record.status === "delivered") ? "delivered" : records.some((record) => record.status === "sent" || record.status === "delivered") ? "sent" : records.some((record) => record.status === "pending") ? "pending" : "failed";
  await db.update(sosAlerts).set({ notificationStatus: status }).where(eq2(sosAlerts.id, incidentId));
}
async function claimSosRecord(db, record) {
  if (record.attemptCount >= record.maxAttempts) {
    await db.update(notificationRecords).set({
      status: "failed",
      errorMessage: `Exceeded maximum delivery attempts (${record.maxAttempts}).`,
      processingAt: null
    }).where(eq2(notificationRecords.id, record.id));
    return false;
  }
  const now = /* @__PURE__ */ new Date();
  const result = await db.update(notificationRecords).set({
    attemptCount: record.attemptCount + 1,
    lastAttemptAt: now,
    processingAt: now,
    nextAttemptAt: new Date(now.getTime() + LOCK_MS)
  }).where(and(eq2(notificationRecords.id, record.id), eq2(notificationRecords.status, "pending"), lte(notificationRecords.nextAttemptAt, now)));
  return resultAffectedRows(result) > 0;
}
async function processSosRecord(db, record) {
  if (!await claimSosRecord(db, record)) return false;
  const [alert, contact, owner] = await Promise.all([
    db.select().from(sosAlerts).where(eq2(sosAlerts.id, record.incidentId)).limit(1),
    db.select().from(emergencyContacts).where(eq2(emergencyContacts.id, record.contactId)).limit(1),
    db.select({ name: users.name }).from(sosAlerts).leftJoin(users, eq2(users.id, sosAlerts.userId)).where(eq2(sosAlerts.id, record.incidentId)).limit(1)
  ]);
  const incident = alert[0];
  const recipient = contact[0];
  if (!incident || !recipient || !["active", "acknowledged"].includes(incident.status)) {
    await db.update(notificationRecords).set({ status: "failed", errorMessage: "Notification suppressed because the incident is no longer active.", processingAt: null }).where(eq2(notificationRecords.id, record.id));
    if (incident) await addTimeline(db, incident.id, "notification_suppressed", `${record.channel.toUpperCase()} notification was not sent because the incident is no longer active (${incident.status})`);
    return true;
  }
  const rawToken = createSecureToken();
  await db.insert(emergencyAccessTokens).values({
    incidentId: incident.id,
    tokenHash: hashSecureToken(rawToken),
    expiresAt: incident.emergencyTokenExpiresAt || new Date(Date.now() + SESSION_LINK_TTL_MS)
  });
  const result = await sendNotification(record.channel, recipient, owner[0]?.name || "a SurakshaShe user", incident, rawToken, record.idempotencyKey);
  const now = /* @__PURE__ */ new Date();
  if (result.status === "sent" || result.status === "delivered") {
    await db.update(notificationRecords).set({
      status: result.status,
      providerMessageId: result.providerMessageId || null,
      errorMessage: null,
      sentAt: now,
      deliveredAt: result.status === "delivered" ? now : null,
      processingAt: null
    }).where(eq2(notificationRecords.id, record.id));
    await addTimeline(db, incident.id, `notification_${result.status}`, `${record.channel.toUpperCase()} ${result.status} for ${recipient.name}${record.recipientVerified ? " (verified channel)" : " (unverified channel)"}`);
  } else if (result.retryable && record.attemptCount + 1 < record.maxAttempts) {
    const nextAttemptAt = retryAt(record.attemptCount + 1);
    await db.update(notificationRecords).set({
      status: "pending",
      errorMessage: result.errorMessage || "Provider request failed; retry scheduled.",
      processingAt: null,
      nextAttemptAt
    }).where(eq2(notificationRecords.id, record.id));
    await addTimeline(db, incident.id, "notification_retry_scheduled", `${record.channel.toUpperCase()} delivery to ${recipient.name} failed; retry ${record.attemptCount + 2} of ${record.maxAttempts} is scheduled`);
  } else {
    await db.update(notificationRecords).set({ status: "failed", errorMessage: result.errorMessage || "Notification provider failed.", processingAt: null }).where(eq2(notificationRecords.id, record.id));
    await addTimeline(db, incident.id, "notification_failed", `${record.channel.toUpperCase()} notification failed for ${recipient.name}: ${result.errorMessage || "provider failure"}`);
  }
  await recalculateIncident(db, incident.id);
  return true;
}
async function processSosNotificationQueue(limit = 25) {
  const db = await getDb();
  if (!db) return { processed: 0 };
  const now = /* @__PURE__ */ new Date();
  const records = await db.select().from(notificationRecords).where(and(eq2(notificationRecords.status, "pending"), lte(notificationRecords.nextAttemptAt, now))).limit(limit);
  let processed = 0;
  for (const record of records) if (await processSosRecord(db, record)) processed += 1;
  return { processed };
}
async function claimCheckInRecord(db, record) {
  if (record.attemptCount >= record.maxAttempts) {
    await db.update(checkInEscalations).set({
      status: "failed",
      errorMessage: `Exceeded maximum delivery attempts (${record.maxAttempts}).`,
      processingAt: null
    }).where(eq2(checkInEscalations.id, record.id));
    return false;
  }
  const now = /* @__PURE__ */ new Date();
  const result = await db.update(checkInEscalations).set({
    attemptCount: record.attemptCount + 1,
    lastAttemptAt: now,
    processingAt: now,
    nextAttemptAt: new Date(now.getTime() + LOCK_MS)
  }).where(and(eq2(checkInEscalations.id, record.id), eq2(checkInEscalations.status, "pending"), lte(checkInEscalations.nextAttemptAt, now)));
  return resultAffectedRows(result) > 0;
}
async function processCheckInRecord(db, record) {
  if (!await claimCheckInRecord(db, record)) return false;
  const [checkIn, contact, owner] = await Promise.all([
    db.select().from(safetyCheckIns).where(eq2(safetyCheckIns.id, record.checkInId)).limit(1),
    db.select().from(emergencyContacts).where(eq2(emergencyContacts.id, record.contactId)).limit(1),
    db.select({ name: users.name }).from(safetyCheckIns).leftJoin(users, eq2(users.id, safetyCheckIns.userId)).where(eq2(safetyCheckIns.id, record.checkInId)).limit(1)
  ]);
  const safetyCheckIn = checkIn[0];
  const recipient = contact[0];
  if (!safetyCheckIn || safetyCheckIn.status !== "expired" || !recipient) {
    await db.update(checkInEscalations).set({ status: "failed", errorMessage: "Notification suppressed because this check-in is no longer overdue.", processingAt: null }).where(eq2(checkInEscalations.id, record.id));
    return true;
  }
  const result = await sendContactMessage(record.channel, recipient, "SurakshaShe safety check-in expired", `The safety check-in from ${owner[0]?.name || "your trusted contact"} was not marked safe by the expected arrival time. Please check in with them or contact emergency services if needed.`, record.idempotencyKey);
  if (result.status === "sent" || result.status === "delivered") {
    await db.update(checkInEscalations).set({ status: "sent", providerMessageId: result.providerMessageId || null, errorMessage: null, processingAt: null }).where(eq2(checkInEscalations.id, record.id));
  } else if (result.retryable && record.attemptCount + 1 < record.maxAttempts) {
    await db.update(checkInEscalations).set({ status: "pending", errorMessage: result.errorMessage || "Provider request failed; retry scheduled.", processingAt: null, nextAttemptAt: retryAt(record.attemptCount + 1) }).where(eq2(checkInEscalations.id, record.id));
  } else {
    await db.update(checkInEscalations).set({ status: "failed", errorMessage: result.errorMessage || "Notification provider failed.", processingAt: null }).where(eq2(checkInEscalations.id, record.id));
  }
  return true;
}
async function processCheckInNotificationQueue(limit = 25) {
  const db = await getDb();
  if (!db) return { processed: 0 };
  const records = await db.select().from(checkInEscalations).where(and(eq2(checkInEscalations.status, "pending"), lte(checkInEscalations.nextAttemptAt, /* @__PURE__ */ new Date()))).limit(limit);
  let processed = 0;
  for (const record of records) if (await processCheckInRecord(db, record)) processed += 1;
  return { processed };
}
async function processSosEscalations() {
  const db = await getDb();
  if (!db) return { escalated: 0 };
  const now = /* @__PURE__ */ new Date();
  const alerts = await db.select().from(sosAlerts).where(and(eq2(sosAlerts.status, "active"), lte(sosAlerts.nextEscalationAt, now))).limit(25);
  let escalated = 0;
  for (const alert of alerts) {
    const nextContacts = await db.select().from(emergencyContacts).where(and(eq2(emergencyContacts.userId, alert.userId), gt(emergencyContacts.priority, alert.escalationLevel))).orderBy(emergencyContacts.priority).limit(1);
    const nextPriority = nextContacts[0]?.priority;
    if (!nextPriority) {
      const ended = await db.update(sosAlerts).set({ nextEscalationAt: null }).where(and(eq2(sosAlerts.id, alert.id), eq2(sosAlerts.status, "active"), eq2(sosAlerts.escalationLevel, alert.escalationLevel)));
      if (resultAffectedRows(ended)) await addTimeline(db, alert.id, "escalation_complete", "No further contact priority is configured for this SOS");
      continue;
    }
    const policy = (await db.select().from(sosEscalationPolicies).where(eq2(sosEscalationPolicies.userId, alert.userId)).limit(1))[0];
    const waitMinutes = policy?.acknowledgementWaitMinutes ?? DEFAULT_WAIT_MINUTES;
    const advanced = await db.update(sosAlerts).set({
      escalationLevel: nextPriority,
      nextEscalationAt: new Date(now.getTime() + waitMinutes * 6e4)
    }).where(and(eq2(sosAlerts.id, alert.id), eq2(sosAlerts.status, "active"), eq2(sosAlerts.escalationLevel, alert.escalationLevel), lte(sosAlerts.nextEscalationAt, now)));
    if (!resultAffectedRows(advanced)) continue;
    const queued = await queueSosPriority(db, alert.id, alert.userId, nextPriority);
    await addTimeline(db, alert.id, "escalated", `No acknowledgement received; escalated to priority ${nextPriority} (${queued} notification channel${queued === 1 ? "" : "s"} queued)`);
    if (!queued) await addTimeline(db, alert.id, "notification_pending", `Priority ${nextPriority} has no configured notification channels.`);
    escalated += 1;
  }
  return { escalated };
}
async function processDeliveryQueues() {
  if (workerRunning) return { skipped: true };
  workerRunning = true;
  try {
    const [escalations, sos, checkIns] = await Promise.all([processSosEscalations(), processSosNotificationQueue(), processCheckInNotificationQueue()]);
    return { escalations: escalations.escalated, sos: sos.processed, checkIns: checkIns.processed };
  } finally {
    workerRunning = false;
  }
}
async function triggerDeliveryWorkerImmediate() {
  try {
    return await processDeliveryQueues();
  } catch (error) {
    console.error("[Delivery worker trigger]", error);
  }
}

// server/checkInService.ts
function affectedRows(result) {
  const value = Array.isArray(result) ? result[0] : result;
  return typeof value?.affectedRows === "number" ? value.affectedRows : 0;
}
async function processExpiredCheckIns(userId) {
  const db = await getDb();
  if (!db) return { expired: 0, notifications: 0 };
  const now = /* @__PURE__ */ new Date();
  const candidates = await db.select({ checkIn: safetyCheckIns, policy: checkInPolicies, userName: users.name }).from(safetyCheckIns).leftJoin(checkInPolicies, eq3(checkInPolicies.userId, safetyCheckIns.userId)).leftJoin(users, eq3(users.id, safetyCheckIns.userId)).where(userId ? and2(eq3(safetyCheckIns.userId, userId), eq3(safetyCheckIns.status, "active")) : eq3(safetyCheckIns.status, "active"));
  let expired = 0;
  let notifications = 0;
  for (const candidate of candidates) {
    const graceMinutes = candidate.policy?.graceMinutes ?? 15;
    if (candidate.checkIn.expectedArrival.getTime() + graceMinutes * 6e4 > now.getTime()) continue;
    const updated = await db.update(safetyCheckIns).set({ status: "expired", completedAt: now }).where(and2(eq3(safetyCheckIns.id, candidate.checkIn.id), eq3(safetyCheckIns.status, "active")));
    if (!updated || affectedRows(updated) === 0) continue;
    expired += 1;
    const escalationEnabled = Boolean(candidate.policy?.escalationEnabled);
    if (escalationEnabled) {
      const contacts = await db.select().from(emergencyContacts).where(and2(eq3(emergencyContacts.userId, candidate.checkIn.userId), eq3(emergencyContacts.priority, 1)));
      for (const contact of contacts) {
        const channels = [
          ...contact.notifySms && contact.phone ? ["sms"] : [],
          ...contact.notifyEmail && contact.email ? ["email"] : [],
          ...contact.notifyWhatsApp && contact.phone ? ["whatsapp"] : []
        ];
        for (const channel of channels) {
          await queueCheckInContact(db, candidate.checkIn.id, contact, channel);
          notifications += 1;
        }
      }
    }
    await db.insert(auditLogs).values({
      actorUserId: candidate.checkIn.userId,
      action: "safety_check_in_expired",
      targetType: "safety_check_in",
      targetId: candidate.checkIn.id,
      metadata: JSON.stringify({ escalationEnabled })
    });
  }
  return { expired, notifications };
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson,
  errorFormatter({ shape, error, path: path2, type }) {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      console.error(`[TRPC Server Error] ${type} on "${path2 ?? "unknown"}":`, {
        code: error.code,
        message: error.message,
        causeCode: error.cause?.code,
        causeSqlState: error.cause?.sqlState,
        causeErrno: error.cause?.errno
      });
    }
    return {
      ...shape,
      data: {
        ...shape.data,
        stack: void 0
        // Never leak stack traces to client
      }
    };
  }
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError3({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError3({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError3({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError3({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
var requireDb = async () => {
  const db = await getDb();
  if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "The safety database is temporarily unavailable." });
  return db;
};
function assertActionLimit(key, limit, windowMs, message) {
  try {
    assertRateLimit(key, limit, windowMs);
  } catch {
    throw new TRPCError4({ code: "TOO_MANY_REQUESTS", message: message || "Too many attempts. Please try again later." });
  }
}
function affectedRows2(result) {
  const value = Array.isArray(result) ? result[0] : result;
  return typeof value?.affectedRows === "number" ? value.affectedRows : 0;
}
async function setAppSession(ctx, user) {
  const token = await createUserSession(user);
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.cookie("suraksha_session", token, { ...cookieOptions, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1e3 });
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, emailVerifiedAt: user.emailVerifiedAt, phoneVerifiedAt: user.phoneVerifiedAt };
}
function appBaseUrl2() {
  return process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL || "";
}
function protectAuthAttempt(ctx, action, email) {
  try {
    assertRateLimit(`${action}:${requestIp(ctx.req)}:${email.toLowerCase()}`, action === "login" ? 10 : 5, action === "login" ? 15 * 60 * 1e3 : 60 * 60 * 1e3);
  } catch {
    throw new TRPCError4({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." });
  }
}
function verificationCode() {
  return String(1e5 + randomBytes2(3).readUIntBE(0, 3) % 9e5);
}
async function createVerification(db, userId, kind, destination, contactId) {
  const code = verificationCode();
  await db.insert(verificationTokens).values({ userId, contactId: contactId ?? null, kind, destination, tokenHash: hashSecureToken(code), expiresAt: new Date(Date.now() + 15 * 60 * 1e3) });
  return { code, result: await sendVerificationNotification(kind, destination, code) };
}
async function deleteUserData(db, userId) {
  const remove = async (tx) => {
    const alerts = await tx.select({ id: sosAlerts.id }).from(sosAlerts).where(eq4(sosAlerts.userId, userId));
    for (const alert of alerts) {
      await tx.delete(notificationRecords).where(eq4(notificationRecords.incidentId, alert.id));
      await tx.delete(incidentTimeline).where(eq4(incidentTimeline.incidentId, alert.id));
      await tx.delete(incidentAcknowledgements).where(eq4(incidentAcknowledgements.incidentId, alert.id));
      await tx.delete(emergencyAccessTokens).where(eq4(emergencyAccessTokens.incidentId, alert.id));
    }
    const checkIns = await tx.select({ id: safetyCheckIns.id }).from(safetyCheckIns).where(eq4(safetyCheckIns.userId, userId));
    for (const checkIn of checkIns) await tx.delete(checkInEscalations).where(eq4(checkInEscalations.checkInId, checkIn.id));
    await tx.delete(sosAlerts).where(eq4(sosAlerts.userId, userId));
    await tx.delete(emergencyContacts).where(eq4(emergencyContacts.userId, userId));
    await tx.delete(safetyCheckIns).where(eq4(safetyCheckIns.userId, userId));
    await tx.delete(checkInPolicies).where(eq4(checkInPolicies.userId, userId));
    await tx.delete(sosEscalationPolicies).where(eq4(sosEscalationPolicies.userId, userId));
    await tx.delete(userSessions).where(eq4(userSessions.userId, userId));
    await tx.delete(passwordResetTokens).where(eq4(passwordResetTokens.userId, userId));
    await tx.delete(verificationTokens).where(eq4(verificationTokens.userId, userId));
    await tx.delete(auditLogs).where(eq4(auditLogs.actorUserId, userId));
    await tx.delete(accountDeletionRequests).where(eq4(accountDeletionRequests.userId, userId));
    await tx.delete(users).where(eq4(users.id, userId));
  };
  if (typeof db.transaction === "function") await db.transaction(remove);
  else await remove(db);
}
async function addTimeline2(db, incidentId, eventType, message) {
  await db.insert(incidentTimeline).values({ incidentId, eventType, message });
}
async function getIncidentByToken(db, token) {
  const hash = hashSecureToken(token);
  const rows = await db.select({ alert: sosAlerts, userName: users.name, userPhone: users.phone }).from(sosAlerts).leftJoin(users, eq4(sosAlerts.userId, users.id)).where(eq4(sosAlerts.emergencyTokenHash, hash)).limit(1);
  if (rows[0]) {
    const row = rows[0];
    if (row.alert.emergencyTokenRevokedAt || !row.alert.emergencyTokenExpiresAt || row.alert.emergencyTokenExpiresAt.getTime() <= Date.now()) return null;
    return row;
  }
  const access = (await db.select({ token: emergencyAccessTokens, alert: sosAlerts, userName: users.name, userPhone: users.phone }).from(emergencyAccessTokens).innerJoin(sosAlerts, eq4(emergencyAccessTokens.incidentId, sosAlerts.id)).leftJoin(users, eq4(sosAlerts.userId, users.id)).where(eq4(emergencyAccessTokens.tokenHash, hash)).limit(1))[0];
  if (!access || access.token.revokedAt || access.token.expiresAt.getTime() <= Date.now() || access.alert.emergencyTokenRevokedAt) return null;
  return { alert: access.alert, userName: access.userName, userPhone: access.userPhone };
}
async function markIncidentSafe(db, userId, incidentId, note) {
  const alert = (await db.select().from(sosAlerts).where(and3(eq4(sosAlerts.id, incidentId), eq4(sosAlerts.userId, userId), inArray(sosAlerts.status, ["active", "acknowledged"]))).limit(1))[0];
  if (!alert) throw new TRPCError4({ code: "NOT_FOUND", message: "Active incident not found." });
  const now = /* @__PURE__ */ new Date();
  await db.update(sosAlerts).set({ status: "resolved", safeMarkedAt: now, resolvedAt: now, resolutionNote: note || "User marked themselves safe.", emergencyTokenRevokedAt: now }).where(eq4(sosAlerts.id, incidentId));
  await db.update(emergencyAccessTokens).set({ revokedAt: now }).where(eq4(emergencyAccessTokens.incidentId, incidentId));
  await addTimeline2(db, incidentId, "safe_marked", "User marked themselves safe");
  return { success: true };
}
var strongPassword = z2.string().min(8).max(128).refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Use at least 8 characters with a letter and a number.");
var phoneNumber = z2.string().trim().regex(/^\+?[1-9][0-9\s().-]{5,31}$/, "Enter a valid phone number.");
var registrationInput = z2.object({ name: z2.string().trim().min(2).max(120), email: z2.string().trim().email().max(320), phone: phoneNumber, password: strongPassword });
var contactInput = z2.object({ name: z2.string().trim().min(2).max(120), phone: phoneNumber, email: z2.string().trim().email().max(320).optional().or(z2.literal("")), relationship: z2.string().trim().max(120).optional(), priority: z2.number().int().min(1).max(5).default(1), notifySms: z2.boolean().default(true), notifyEmail: z2.boolean().default(true), notifyWhatsApp: z2.boolean().default(false) });
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user ? publicUser(ctx.user) : null),
    register: publicProcedure.input(registrationInput).mutation(async ({ ctx, input }) => {
      protectAuthAttempt(ctx, "register", input.email);
      const db = await requireDb();
      const email = input.email.toLowerCase().trim();
      if (await getUserByEmail(email)) throw new TRPCError4({ code: "BAD_REQUEST", message: "An account with this email already exists." });
      if (await getUserByPhone(input.phone)) throw new TRPCError4({ code: "BAD_REQUEST", message: "An account with this phone number already exists." });
      let authId = null;
      if (isSupabaseConfigured()) {
        try {
          const admin = getSupabaseAdmin();
          const { data, error } = await admin.auth.admin.createUser({
            email,
            password: input.password,
            email_confirm: true,
            user_metadata: { name: input.name, phone: input.phone }
          });
          if (error) {
            throw new TRPCError4({ code: "BAD_REQUEST", message: error.message });
          }
          authId = data.user?.id ?? null;
        } catch (error) {
          if (error instanceof TRPCError4) throw error;
          console.error("[Supabase Register Error]:", error);
          throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: error?.message || "Failed to create authentication user." });
        }
      }
      const openId = authId ? `sb-${authId}` : `local-${randomBytes2(20).toString("hex")}`;
      try {
        await db.insert(users).values({
          authId,
          openId,
          name: input.name,
          email,
          phone: input.phone,
          passwordHash: await hashPassword(input.password),
          loginMethod: isSupabaseConfigured() ? "supabase" : "password",
          role: "user"
        });
      } catch (error) {
        const cause = error?.cause || error;
        console.error("[Registration Error] Postgres detailed error:", {
          code: cause?.code,
          message: cause?.message,
          detail: cause?.detail,
          constraint: cause?.constraint_name,
          table: cause?.table_name,
          column: cause?.column_name,
          hint: cause?.hint
        });
        throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Account creation failed due to a database error." });
      }
      const user = await getUserByEmail(email);
      if (!user) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Account creation failed." });
      if (isSupabaseConfigured()) {
        try {
          const anonClient = getSupabaseAnonClient();
          const { data } = await anonClient.auth.signInWithPassword({ email, password: input.password });
          if (data?.session?.access_token && ctx.res) {
            ctx.res.cookie("sb_access_token", data.session.access_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: 30 * 24 * 60 * 60 * 1e3
            });
          }
        } catch (sessionErr) {
          console.warn("[Register] Could not set Supabase session cookie:", sessionErr);
        }
      }
      await setAppSession(ctx, user);
      return publicUser(user);
    }),
    login: publicProcedure.input(z2.object({ email: z2.string().trim().email(), password: z2.string().min(1) })).mutation(async ({ ctx, input }) => {
      protectAuthAttempt(ctx, "login", input.email);
      const email = input.email.toLowerCase().trim();
      let user = await getUserByEmail(email);
      if (isSupabaseConfigured()) {
        let sbLoggedIn = false;
        try {
          const anonClient = getSupabaseAnonClient();
          const { data, error } = await anonClient.auth.signInWithPassword({ email, password: input.password });
          if (!error && data?.session) {
            sbLoggedIn = true;
            if (ctx.res) {
              ctx.res.cookie("sb_access_token", data.session.access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: 30 * 24 * 60 * 60 * 1e3
              });
            }
            if (user && !user.authId) {
              const db2 = await requireDb();
              await db2.update(users).set({ authId: data.user.id, loginMethod: "supabase" }).where(eq4(users.id, user.id));
              user.authId = data.user.id;
            }
          }
        } catch (sbErr) {
          console.warn("[Supabase Login] Direct signInWithPassword failed, testing fallback:", sbErr);
        }
        if (!sbLoggedIn) {
          if (user?.passwordHash && await verifyPassword(input.password, user.passwordHash)) {
            try {
              const admin = getSupabaseAdmin();
              const { data: createdUser } = await admin.auth.admin.createUser({
                email,
                password: input.password,
                email_confirm: true,
                user_metadata: { name: user.name, phone: user.phone }
              });
              if (createdUser?.user) {
                const db2 = await requireDb();
                await db2.update(users).set({ authId: createdUser.user.id, loginMethod: "supabase" }).where(eq4(users.id, user.id));
                user.authId = createdUser.user.id;
              }
            } catch (migrateErr) {
              console.warn("[Auth Migration] Error migrating user to Supabase Auth:", migrateErr);
            }
          } else {
            throw new TRPCError4({ code: "UNAUTHORIZED", message: "Invalid email or password." });
          }
        }
      } else {
        if (!user?.passwordHash || !await verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError4({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }
      }
      if (!user) throw new TRPCError4({ code: "UNAUTHORIZED", message: "User account not found." });
      const db = await requireDb();
      await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq4(users.id, user.id));
      await setAppSession(ctx, user);
      return publicUser({ ...user, lastSignedIn: /* @__PURE__ */ new Date() });
    }),
    requestPasswordReset: publicProcedure.input(z2.object({ email: z2.string().trim().email() })).mutation(async ({ ctx, input }) => {
      protectAuthAttempt(ctx, "reset", input.email);
      const email = input.email.toLowerCase().trim();
      const base = appBaseUrl2() || "http://localhost:3000";
      if (isSupabaseConfigured()) {
        try {
          const admin = getSupabaseAdmin();
          const resetUrl = `${base.replace(/\/$/, "")}/reset-password`;
          const { error } = await admin.auth.resetPasswordForEmail(email, {
            redirectTo: resetUrl
          });
          if (error) {
            console.warn("[Supabase Reset Password] Error requesting reset:", error);
          } else {
            console.log(`[Supabase Reset Password] Sent reset email for ${email}`);
            return { success: true, status: "sent" };
          }
        } catch (sbErr) {
          console.warn("[Supabase Reset Password] Failed, falling back to Resend:", sbErr);
        }
      }
      const db = await requireDb();
      if (!isEmailConfigured()) {
        const devMsg = "Email delivery service is not configured on this server (Supabase / Resend missing).";
        const prodMsg = "Email delivery is not available. Please contact support.";
        const isDev = process.env.NODE_ENV !== "production";
        console.warn(`[Password Reset] ${devMsg}`);
        throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: isDev ? devMsg : prodMsg });
      }
      const isProd = process.env.NODE_ENV === "production";
      if (isProd && (!base || !base.startsWith("https://"))) {
        const msg = "Server configuration error: APP_BASE_URL must use HTTPS in production.";
        console.error(`[Password Reset] ${msg}`);
        throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
      const user = await getUserByEmail(email);
      if (user?.email) {
        const rawToken = createSecureToken();
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash: hashSecureToken(rawToken),
          expiresAt: new Date(Date.now() + 30 * 60 * 1e3)
        });
        const resetBase = base || "http://localhost:3000";
        const link = `${resetBase.replace(/\/$/, "")}/reset-password/${encodeURIComponent(rawToken)}`;
        console.log(`[Password Reset] Generated reset token for user ID ${user.id}. Dispatching email via Resend...`);
        const delivery = await sendPasswordResetEmail(user.email, link);
        if (delivery.status === "failed") {
          console.error(`[Password Reset] Delivery failed for user ID ${user.id}: ${delivery.errorMessage}`);
          throw new TRPCError4({
            code: "INTERNAL_SERVER_ERROR",
            message: delivery.errorMessage || "Email provider failed to accept the reset message."
          });
        }
        console.log(`[Password Reset] Email accepted by provider for user ID ${user.id}. Provider Message ID: ${delivery.providerMessageId}`);
        return { success: true, status: "sent", providerMessageId: delivery.providerMessageId };
      } else {
        console.log(`[Password Reset] Request received for unverified/non-existent email (returning privacy-preserving response).`);
        return { success: true, status: "accepted" };
      }
    }),
    resetPassword: publicProcedure.input(z2.object({ token: z2.string().min(32).max(100), password: strongPassword })).mutation(async ({ input }) => {
      const db = await requireDb();
      const tokenHash = hashSecureToken(input.token);
      const tokenRow = (await db.select().from(passwordResetTokens).where(eq4(passwordResetTokens.tokenHash, tokenHash)).limit(1))[0];
      if (!tokenRow || tokenRow.usedAt || tokenRow.expiresAt.getTime() < Date.now()) throw new TRPCError4({ code: "BAD_REQUEST", message: "This reset link is invalid or expired." });
      const resetUser = (await db.select({ sessionVersion: users.sessionVersion }).from(users).where(eq4(users.id, tokenRow.userId)).limit(1))[0];
      if (!resetUser) throw new TRPCError4({ code: "BAD_REQUEST", message: "This reset link is invalid or expired." });
      const claimed = await db.update(passwordResetTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(and3(eq4(passwordResetTokens.id, tokenRow.id), isNull(passwordResetTokens.usedAt)));
      if (affectedRows2(claimed) === 0) throw new TRPCError4({ code: "BAD_REQUEST", message: "This reset link is invalid or expired." });
      await db.update(users).set({ passwordHash: await hashPassword(input.password), sessionVersion: resetUser.sessionVersion + 1 }).where(eq4(users.id, tokenRow.userId));
      await db.update(userSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq4(userSessions.userId, tokenRow.userId));
      console.log(`[Password Reset] Successfully updated password for user ID ${tokenRow.userId} and revoked all active sessions.`);
      return { success: true };
    }),
    requestVerification: protectedProcedure.input(z2.object({ kind: z2.enum(["email", "phone"]) })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`auth-req-verify:${ctx.user.id}`, 5, 15 * 60 * 1e3, "Too many verification requests. Please wait before trying again.");
      const db = await requireDb();
      const destination = input.kind === "email" ? ctx.user.email : ctx.user.phone;
      if (!destination) throw new TRPCError4({ code: "BAD_REQUEST", message: `Add a ${input.kind} before requesting verification.` });
      const delivery = await createVerification(db, ctx.user.id, input.kind, destination);
      return { status: delivery.result.status, message: delivery.result.status === "failed" ? delivery.result.errorMessage : "Verification code sent." };
    }),
    verify: protectedProcedure.input(z2.object({ kind: z2.enum(["email", "phone"]), code: z2.string().regex(/^\d{6}$/) })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`auth-verify:${ctx.user.id}`, 6, 15 * 60 * 1e3, "Too many verification attempts. Please request a new code later.");
      const db = await requireDb();
      const rows = await db.select().from(verificationTokens).where(and3(eq4(verificationTokens.userId, ctx.user.id), eq4(verificationTokens.kind, input.kind), eq4(verificationTokens.tokenHash, hashSecureToken(input.code)))).orderBy(desc(verificationTokens.id)).limit(1);
      const token = rows[0];
      if (!token || token.usedAt || token.expiresAt.getTime() < Date.now() || token.contactId) throw new TRPCError4({ code: "BAD_REQUEST", message: "That verification code is invalid or expired." });
      await db.update(verificationTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(eq4(verificationTokens.id, token.id));
      await db.update(users).set(input.kind === "email" ? { emailVerifiedAt: /* @__PURE__ */ new Date() } : { phoneVerifiedAt: /* @__PURE__ */ new Date() }).where(eq4(users.id, ctx.user.id));
      return { success: true };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const rawCookie = typeof ctx.req.headers.cookie === "string" ? ctx.req.headers.cookie.split(";").map((value) => value.trim()).find((value) => value.startsWith("suraksha_session="))?.slice("suraksha_session=".length) : void 0;
      if (rawCookie) {
        const parts = rawCookie.split(".");
        const sessionId = parts.length === 5 ? parts[3] : void 0;
        if (sessionId) {
          const db = await getDb();
          if (db) await db.update(userSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq4(userSessions.sessionIdHash, hashSecureToken(sessionId)));
        }
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("suraksha_session", { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("sb_access_token", { path: "/", maxAge: -1 });
      ctx.res.clearCookie("sb-access-token", { path: "/", maxAge: -1 });
      return { success: true };
    })
  }),
  contacts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(emergencyContacts).where(eq4(emergencyContacts.userId, ctx.user.id)).orderBy(emergencyContacts.priority, desc(emergencyContacts.createdAt));
    }),
    create: protectedProcedure.input(contactInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const cleanPhone = cleanPhoneNumber(input.phone);
      const normalizedEmail = input.email ? input.email.trim().toLowerCase() : null;
      const existingPhone = (await db.select({ id: emergencyContacts.id }).from(emergencyContacts).where(and3(eq4(emergencyContacts.userId, ctx.user.id), eq4(emergencyContacts.phone, cleanPhone))).limit(1))[0];
      if (existingPhone) throw new TRPCError4({ code: "BAD_REQUEST", message: "A trusted contact with this phone number already exists." });
      if (normalizedEmail) {
        const existingEmail = (await db.select({ id: emergencyContacts.id }).from(emergencyContacts).where(and3(eq4(emergencyContacts.userId, ctx.user.id), eq4(emergencyContacts.email, normalizedEmail))).limit(1))[0];
        if (existingEmail) throw new TRPCError4({ code: "BAD_REQUEST", message: "A trusted contact with this email address already exists." });
      }
      await db.insert(emergencyContacts).values({ userId: ctx.user.id, ...input, phone: cleanPhone, email: normalizedEmail, relationship: input.relationship || null });
      const rows = await db.select().from(emergencyContacts).where(eq4(emergencyContacts.userId, ctx.user.id)).orderBy(desc(emergencyContacts.id)).limit(1);
      return rows[0];
    }),
    update: protectedProcedure.input(contactInput.extend({ id: z2.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = await db.select().from(emergencyContacts).where(and3(eq4(emergencyContacts.id, input.id), eq4(emergencyContacts.userId, ctx.user.id))).limit(1);
      if (!existing[0]) throw new TRPCError4({ code: "NOT_FOUND", message: "Contact not found." });
      const cleanPhone = cleanPhoneNumber(input.phone);
      const normalizedEmail = input.email ? input.email.trim().toLowerCase() : null;
      const conflictPhone = await db.select({ id: emergencyContacts.id }).from(emergencyContacts).where(and3(eq4(emergencyContacts.userId, ctx.user.id), eq4(emergencyContacts.phone, cleanPhone))).limit(2);
      if (conflictPhone.some((c) => c.id !== input.id)) throw new TRPCError4({ code: "BAD_REQUEST", message: "Another trusted contact already has this phone number." });
      if (normalizedEmail) {
        const conflictEmail = await db.select({ id: emergencyContacts.id }).from(emergencyContacts).where(and3(eq4(emergencyContacts.userId, ctx.user.id), eq4(emergencyContacts.email, normalizedEmail))).limit(2);
        if (conflictEmail.some((c) => c.id !== input.id)) throw new TRPCError4({ code: "BAD_REQUEST", message: "Another trusted contact already has this email address." });
      }
      await db.update(emergencyContacts).set({ name: input.name, phone: cleanPhone, email: normalizedEmail, relationship: input.relationship || null, priority: input.priority, notifySms: input.notifySms, notifyEmail: input.notifyEmail, notifyWhatsApp: input.notifyWhatsApp, phoneVerifiedAt: existing[0].phone === cleanPhone ? existing[0].phoneVerifiedAt : null, emailVerifiedAt: existing[0].email === normalizedEmail ? existing[0].emailVerifiedAt : null }).where(eq4(emergencyContacts.id, input.id));
      return { success: true };
    }),
    remove: protectedProcedure.input(z2.object({ id: z2.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.delete(emergencyContacts).where(and3(eq4(emergencyContacts.id, input.id), eq4(emergencyContacts.userId, ctx.user.id)));
      return { success: true };
    }),
    requestVerification: protectedProcedure.input(z2.object({ id: z2.number().int(), kind: z2.enum(["email", "phone"]) })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`contact-req-verify:${ctx.user.id}:${input.id}`, 5, 15 * 60 * 1e3, "Too many verification requests for this contact.");
      const db = await requireDb();
      const contact = (await db.select().from(emergencyContacts).where(and3(eq4(emergencyContacts.id, input.id), eq4(emergencyContacts.userId, ctx.user.id))).limit(1))[0];
      if (!contact) throw new TRPCError4({ code: "NOT_FOUND", message: "Contact not found." });
      const destination = input.kind === "email" ? contact.email : contact.phone;
      if (!destination) throw new TRPCError4({ code: "BAD_REQUEST", message: `This contact has no ${input.kind} address.` });
      const delivery = await createVerification(db, ctx.user.id, input.kind, destination, contact.id);
      return { status: delivery.result.status, message: delivery.result.status === "failed" ? delivery.result.errorMessage : "Verification code sent." };
    }),
    verify: protectedProcedure.input(z2.object({ id: z2.number().int(), kind: z2.enum(["email", "phone"]), code: z2.string().regex(/^\d{6}$/) })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`contact-verify:${ctx.user.id}:${input.id}`, 6, 15 * 60 * 1e3, "Too many verification attempts for this contact.");
      const db = await requireDb();
      const contact = (await db.select().from(emergencyContacts).where(and3(eq4(emergencyContacts.id, input.id), eq4(emergencyContacts.userId, ctx.user.id))).limit(1))[0];
      if (!contact) throw new TRPCError4({ code: "NOT_FOUND", message: "Contact not found." });
      const token = (await db.select().from(verificationTokens).where(and3(eq4(verificationTokens.userId, ctx.user.id), eq4(verificationTokens.contactId, input.id), eq4(verificationTokens.kind, input.kind), eq4(verificationTokens.tokenHash, hashSecureToken(input.code)))).orderBy(desc(verificationTokens.id)).limit(1))[0];
      if (!token || token.usedAt || token.expiresAt.getTime() < Date.now()) throw new TRPCError4({ code: "BAD_REQUEST", message: "That verification code is invalid or expired." });
      await db.update(verificationTokens).set({ usedAt: /* @__PURE__ */ new Date() }).where(eq4(verificationTokens.id, token.id));
      await db.update(emergencyContacts).set(input.kind === "email" ? { emailVerifiedAt: /* @__PURE__ */ new Date() } : { phoneVerifiedAt: /* @__PURE__ */ new Date() }).where(eq4(emergencyContacts.id, input.id));
      return { success: true };
    })
  }),
  sos: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      try {
        await processSosEscalations();
        await processDeliveryQueues();
      } catch (err) {
        console.error("[SOS Escalation Query Error]:", err);
      }
      return db.select().from(sosAlerts).where(eq4(sosAlerts.userId, ctx.user.id)).orderBy(desc(sosAlerts.createdAt));
    }),
    policy: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const policy = (await db.select().from(sosEscalationPolicies).where(eq4(sosEscalationPolicies.userId, ctx.user.id)).limit(1))[0];
      return policy || { acknowledgementWaitMinutes: 5 };
    }),
    updatePolicy: protectedProcedure.input(z2.object({ acknowledgementWaitMinutes: z2.number().int().min(1).max(1440) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.insert(sosEscalationPolicies).values({ userId: ctx.user.id, acknowledgementWaitMinutes: input.acknowledgementWaitMinutes }).onConflictDoUpdate({ target: sosEscalationPolicies.userId, set: { acknowledgementWaitMinutes: input.acknowledgementWaitMinutes } });
      return { success: true };
    }),
    detail: protectedProcedure.input(z2.object({ id: z2.number().int() })).query(async ({ ctx, input }) => {
      const db = await requireDb();
      const alert = (await db.select().from(sosAlerts).where(and3(eq4(sosAlerts.id, input.id), eq4(sosAlerts.userId, ctx.user.id))).limit(1))[0];
      if (!alert) throw new TRPCError4({ code: "NOT_FOUND", message: "Incident not found." });
      const [timeline, notifications, acknowledgements] = await Promise.all([
        db.select().from(incidentTimeline).where(eq4(incidentTimeline.incidentId, alert.id)).orderBy(incidentTimeline.createdAt),
        db.select().from(notificationRecords).where(eq4(notificationRecords.incidentId, alert.id)).orderBy(notificationRecords.createdAt),
        db.select().from(incidentAcknowledgements).where(eq4(incidentAcknowledgements.incidentId, alert.id)).orderBy(incidentAcknowledgements.createdAt)
      ]);
      return { alert, timeline, notifications, acknowledgements };
    }),
    create: protectedProcedure.input(z2.object({ latitude: z2.number().finite().min(-90).max(90), longitude: z2.number().finite().min(-180).max(180), accuracy: z2.number().finite().min(0).max(1e5).optional(), address: z2.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`sos-create:${ctx.user.id}`, 2, 5e3, "Please wait a moment before sending another SOS.");
      const db = await requireDb();
      const active = await db.select({ id: sosAlerts.id }).from(sosAlerts).where(and3(eq4(sosAlerts.userId, ctx.user.id), inArray(sosAlerts.status, ["active", "acknowledged"]))).limit(1);
      if (active[0]) throw new TRPCError4({ code: "CONFLICT", message: "You already have an active SOS. Mark yourself safe before starting another." });
      const rawToken = createSecureToken();
      const now = /* @__PURE__ */ new Date();
      const policy = (await db.select().from(sosEscalationPolicies).where(eq4(sosEscalationPolicies.userId, ctx.user.id)).limit(1))[0];
      const waitMinutes = policy?.acknowledgementWaitMinutes ?? 5;
      await db.insert(sosAlerts).values({ userId: ctx.user.id, latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy ?? null, address: input.address || null, initialLatitude: input.latitude, initialLongitude: input.longitude, initialAccuracy: input.accuracy ?? null, lastLocationAt: now, emergencyTokenHash: hashSecureToken(rawToken), emergencyTokenExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1e3), notificationStatus: "pending", activatedAt: now, nextEscalationAt: new Date(now.getTime() + waitMinutes * 6e4) });
      const alert = (await db.select().from(sosAlerts).where(and3(eq4(sosAlerts.userId, ctx.user.id), eq4(sosAlerts.emergencyTokenHash, hashSecureToken(rawToken)))).limit(1))[0];
      if (!alert) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Incident could not be created." });
      await addTimeline2(db, alert.id, "activated", "SOS activated");
      await addTimeline2(db, alert.id, "location_captured", "Location captured");
      await addTimeline2(db, alert.id, "incident_created", "Emergency incident created");
      const queued = await queueSosPriority(db, alert.id, ctx.user.id, 1);
      if (!queued) {
        const contacts = await db.select().from(emergencyContacts).where(eq4(emergencyContacts.userId, ctx.user.id));
        const hasFutureChannel = contacts.some((contact) => contact.priority > 1 && (contact.notifySms && contact.phone || contact.notifyEmail && contact.email || contact.notifyWhatsApp && contact.phone));
        if (hasFutureChannel) await addTimeline2(db, alert.id, "notification_pending", "No priority-1 notification channels are configured; escalation will continue to the next priority.");
        else {
          await db.update(sosAlerts).set({ notificationStatus: "failed" }).where(eq4(sosAlerts.id, alert.id));
          await addTimeline2(db, alert.id, "notification_failed", "No configured notification channels are available.");
        }
      }
      await triggerDeliveryWorkerImmediate();
      const currentAlert = (await db.select().from(sosAlerts).where(eq4(sosAlerts.id, alert.id)).limit(1))[0] || alert;
      return { alert: currentAlert, emergencyLink: appBaseUrl2() ? `${appBaseUrl2()}/emergency/${encodeURIComponent(rawToken)}` : `/emergency/${encodeURIComponent(rawToken)}` };
    }),
    updateLocation: protectedProcedure.input(z2.object({ id: z2.number().int(), latitude: z2.number().finite().min(-90).max(90), longitude: z2.number().finite().min(-180).max(180), accuracy: z2.number().finite().min(0).max(1e5).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const alert = (await db.select().from(sosAlerts).where(and3(eq4(sosAlerts.id, input.id), eq4(sosAlerts.userId, ctx.user.id), inArray(sosAlerts.status, ["active", "acknowledged"]))).limit(1))[0];
      if (!alert) throw new TRPCError4({ code: "NOT_FOUND", message: "Active incident not found." });
      const now = /* @__PURE__ */ new Date();
      await db.update(sosAlerts).set({ latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy ?? null, lastLocationAt: now }).where(eq4(sosAlerts.id, input.id));
      await addTimeline2(db, input.id, "location_updated", "Live location updated");
      return { success: true, updatedAt: now };
    }),
    markSafe: protectedProcedure.input(z2.object({ id: z2.number().int(), note: z2.string().trim().max(240).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      return markIncidentSafe(db, ctx.user.id, input.id, input.note);
    }),
    resolve: protectedProcedure.input(z2.object({ id: z2.number().int(), note: z2.string().trim().max(240).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      return markIncidentSafe(db, ctx.user.id, input.id, input.note);
    }),
    cancel: protectedProcedure.input(z2.object({ id: z2.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const now = /* @__PURE__ */ new Date();
      const alert = (await db.select({ id: sosAlerts.id }).from(sosAlerts).where(and3(eq4(sosAlerts.id, input.id), eq4(sosAlerts.userId, ctx.user.id), inArray(sosAlerts.status, ["active", "acknowledged"]))).limit(1))[0];
      if (!alert) throw new TRPCError4({ code: "NOT_FOUND", message: "Active incident not found." });
      await db.update(sosAlerts).set({ status: "cancelled", emergencyTokenRevokedAt: now, nextEscalationAt: null }).where(eq4(sosAlerts.id, input.id));
      await db.update(emergencyAccessTokens).set({ revokedAt: now }).where(eq4(emergencyAccessTokens.incidentId, input.id));
      await addTimeline2(db, input.id, "cancelled", "SOS cancelled by user");
      return { success: true };
    })
  }),
  emergency: router({
    view: publicProcedure.input(z2.object({ token: z2.string().min(32).max(100) })).query(async ({ input }) => {
      const db = await requireDb();
      try {
        await processSosEscalations();
        await processDeliveryQueues();
      } catch (err) {
        console.error("[Emergency Escalation Query Error]:", err);
      }
      const row = await getIncidentByToken(db, input.token);
      if (!row) throw new TRPCError4({ code: "NOT_FOUND", message: "This emergency link is invalid, expired, or revoked." });
      const rawTimeline = await db.select().from(incidentTimeline).where(eq4(incidentTimeline.incidentId, row.alert.id)).orderBy(incidentTimeline.createdAt);
      const publicAllowedEvents = /* @__PURE__ */ new Set(["activated", "location_captured", "location_updated", "contact_acknowledged", "contact_responding", "safe_marked", "cancelled", "incident_created"]);
      const timeline = rawTimeline.filter((event) => publicAllowedEvents.has(event.eventType)).map((event) => ({ id: event.id, eventType: event.eventType, message: event.message, createdAt: event.createdAt }));
      const alert = {
        id: row.alert.id,
        status: row.alert.status,
        latitude: row.alert.latitude,
        longitude: row.alert.longitude,
        accuracy: row.alert.accuracy,
        address: row.alert.address,
        activatedAt: row.alert.activatedAt,
        lastLocationAt: row.alert.lastLocationAt,
        createdAt: row.alert.createdAt
      };
      return { alert, userName: row.userName, userPhone: row.userPhone, timeline, emergencyNumber: "112" };
    }),
    acknowledge: publicProcedure.input(z2.object({ token: z2.string().min(32).max(100), contactName: z2.string().trim().min(2).max(120), contactPhone: phoneNumber, response: z2.enum(["acknowledged", "responding"]) })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`emergency-ack:${requestIp(ctx.req)}:${input.token.slice(0, 16)}`, 10, 15 * 60 * 1e3, "Too many response attempts. Please try again later.");
      const db = await requireDb();
      const row = await getIncidentByToken(db, input.token);
      if (!row) throw new TRPCError4({ code: "NOT_FOUND", message: "This emergency link is invalid, expired, or revoked." });
      if (row.alert.status === "resolved" || row.alert.status === "cancelled") {
        throw new TRPCError4({ code: "BAD_REQUEST", message: `This incident has already been ${row.alert.status}.` });
      }
      const cleanInputPhone = cleanPhoneNumber(input.contactPhone);
      const normalizedInputName = input.contactName.trim().toLowerCase();
      const contacts = await db.select().from(emergencyContacts).where(eq4(emergencyContacts.userId, row.alert.userId));
      const contact = contacts.find((c) => cleanPhoneNumber(c.phone) === cleanInputPhone && c.name.trim().toLowerCase() === normalizedInputName);
      if (!contact) throw new TRPCError4({ code: "FORBIDDEN", message: "We could not match those details to a trusted contact." });
      const existing = (await db.select({ id: incidentAcknowledgements.id }).from(incidentAcknowledgements).where(and3(eq4(incidentAcknowledgements.incidentId, row.alert.id), eq4(incidentAcknowledgements.contactId, contact.id))).limit(1))[0];
      if (!existing) {
        await db.insert(incidentAcknowledgements).values({ incidentId: row.alert.id, contactId: contact.id, response: input.response });
        await addTimeline2(db, row.alert.id, `contact_${input.response}`, `${contact.name} marked themselves ${input.response}`);
      } else {
        await db.update(incidentAcknowledgements).set({ response: input.response }).where(eq4(incidentAcknowledgements.id, existing.id));
        await addTimeline2(db, row.alert.id, `contact_${input.response}`, `${contact.name} updated response to ${input.response}`);
      }
      if (row.alert.status === "active") await db.update(sosAlerts).set({ status: "acknowledged", nextEscalationAt: null }).where(and3(eq4(sosAlerts.id, row.alert.id), eq4(sosAlerts.status, "active")));
      return { success: true };
    })
  }),
  checkIns: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      try {
        await processExpiredCheckIns(ctx.user.id);
        await processDeliveryQueues();
      } catch (err) {
        console.error("[Check-In List Sweep Error]:", err);
      }
      return db.select().from(safetyCheckIns).where(eq4(safetyCheckIns.userId, ctx.user.id)).orderBy(desc(safetyCheckIns.createdAt));
    }),
    policy: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const policy = (await db.select().from(checkInPolicies).where(eq4(checkInPolicies.userId, ctx.user.id)).limit(1))[0];
      return policy || { escalationEnabled: false, graceMinutes: 15 };
    }),
    updatePolicy: protectedProcedure.input(z2.object({ escalationEnabled: z2.boolean(), graceMinutes: z2.number().int().min(5).max(1440) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.insert(checkInPolicies).values({ userId: ctx.user.id, escalationEnabled: input.escalationEnabled, graceMinutes: input.graceMinutes }).onConflictDoUpdate({ target: checkInPolicies.userId, set: { escalationEnabled: input.escalationEnabled, graceMinutes: input.graceMinutes } });
      return { success: true };
    }),
    processExpired: protectedProcedure.mutation(async ({ ctx }) => processExpiredCheckIns(ctx.user.id)),
    create: protectedProcedure.input(z2.object({ message: z2.string().trim().min(2).max(240), expectedArrival: z2.coerce.date(), reminderAt: z2.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
      if (input.expectedArrival.getTime() <= Date.now()) throw new TRPCError4({ code: "BAD_REQUEST", message: "Expected arrival must be in the future." });
      const db = await requireDb();
      await db.insert(safetyCheckIns).values({ userId: ctx.user.id, message: input.message, expectedArrival: input.expectedArrival, reminderAt: input.reminderAt ?? null });
      return { success: true };
    }),
    markSafe: protectedProcedure.input(z2.object({ id: z2.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const result = await db.update(safetyCheckIns).set({ status: "safe", completedAt: /* @__PURE__ */ new Date() }).where(and3(eq4(safetyCheckIns.id, input.id), eq4(safetyCheckIns.userId, ctx.user.id), eq4(safetyCheckIns.status, "active")));
      if (affectedRows2(result) === 0) throw new TRPCError4({ code: "NOT_FOUND", message: "Active check-in not found." });
      return { success: true };
    }),
    cancel: protectedProcedure.input(z2.object({ id: z2.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const result = await db.update(safetyCheckIns).set({ status: "cancelled", completedAt: /* @__PURE__ */ new Date() }).where(and3(eq4(safetyCheckIns.id, input.id), eq4(safetyCheckIns.userId, ctx.user.id), eq4(safetyCheckIns.status, "active")));
      if (affectedRows2(result) === 0) throw new TRPCError4({ code: "NOT_FOUND", message: "Active check-in not found." });
      return { success: true };
    })
  }),
  privacy: router({
    exportData: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const [profile, contacts, alerts, checkIns] = await Promise.all([
        db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, createdAt: users.createdAt }).from(users).where(eq4(users.id, ctx.user.id)).limit(1),
        db.select().from(emergencyContacts).where(eq4(emergencyContacts.userId, ctx.user.id)),
        db.select().from(sosAlerts).where(eq4(sosAlerts.userId, ctx.user.id)),
        db.select().from(safetyCheckIns).where(eq4(safetyCheckIns.userId, ctx.user.id))
      ]);
      return { profile: profile[0], contacts, alerts, checkIns, exportedAt: /* @__PURE__ */ new Date() };
    }),
    deleteAlertHistory: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      const activeAlert = (await db.select({ id: sosAlerts.id }).from(sosAlerts).where(and3(eq4(sosAlerts.userId, ctx.user.id), inArray(sosAlerts.status, ["active", "acknowledged"]))).limit(1))[0];
      if (activeAlert) throw new TRPCError4({ code: "BAD_REQUEST", message: "You have an active SOS incident in progress. Mark yourself safe before clearing history." });
      const alerts = await db.select({ id: sosAlerts.id }).from(sosAlerts).where(eq4(sosAlerts.userId, ctx.user.id));
      for (const alert of alerts) {
        await db.delete(notificationRecords).where(eq4(notificationRecords.incidentId, alert.id));
        await db.delete(incidentTimeline).where(eq4(incidentTimeline.incidentId, alert.id));
        await db.delete(incidentAcknowledgements).where(eq4(incidentAcknowledgements.incidentId, alert.id));
        await db.delete(emergencyAccessTokens).where(eq4(emergencyAccessTokens.incidentId, alert.id));
      }
      await db.delete(sosAlerts).where(eq4(sosAlerts.userId, ctx.user.id));
      return { success: true };
    }),
    deleteAccount: protectedProcedure.input(z2.object({ confirmation: z2.literal("DELETE MY ACCOUNT") })).mutation(async ({ ctx }) => {
      const db = await requireDb();
      await db.insert(accountDeletionRequests).values({ userId: ctx.user.id, completedAt: /* @__PURE__ */ new Date() });
      await deleteUserData(db, ctx.user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("suraksha_session", { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  file: router({
    upload: protectedProcedure.input(z2.object({
      fileName: z2.string(),
      mimeType: z2.string(),
      base64Data: z2.string(),
      context: z2.enum(["profile", "evidence", "suspect", "vehicle", "other"]).default("other"),
      contextId: z2.number().optional()
    })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const buffer = Buffer.from(input.base64Data, "base64");
      const { fileKey, sizeBytes } = await saveUploadedFile(buffer, input.fileName, input.mimeType);
      const [record] = await db.insert(fileUploads).values({
        uploadedByUserId: ctx.user.id,
        fileKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes,
        context: input.context,
        contextId: input.contextId
      }).returning();
      return { fileKey: record.fileKey, id: record.id };
    })
  }),
  suspects: router({
    create: protectedProcedure.input(z2.object({
      name: z2.string().min(1),
      description: z2.string().optional(),
      gender: z2.string().optional(),
      ageApprox: z2.string().optional(),
      notes: z2.string().optional(),
      lastKnownLocation: z2.string().optional(),
      observedAt: z2.coerce.date().optional()
    })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [report] = await db.insert(personOfConcernReports).values({
        reportedByUserId: ctx.user.id,
        ...input
      }).returning();
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "suspect_report_created", metadata: JSON.stringify({ reportId: report.id }) });
      return report;
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(personOfConcernReports).where(eq4(personOfConcernReports.reportedByUserId, ctx.user.id)).orderBy(desc(personOfConcernReports.createdAt));
    })
  }),
  vehicles: router({
    create: protectedProcedure.input(z2.object({
      registrationNumber: z2.string().optional(),
      type: z2.string().optional(),
      makeModel: z2.string().optional(),
      color: z2.string().optional(),
      description: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const normalizedRegistration = input.registrationNumber ? input.registrationNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : void 0;
      const [report] = await db.insert(vehicleReports).values({
        reportedByUserId: ctx.user.id,
        ...input,
        normalizedRegistration
      }).returning();
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "vehicle_report_created", metadata: JSON.stringify({ reportId: report.id }) });
      return report;
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(vehicleReports).where(eq4(vehicleReports.reportedByUserId, ctx.user.id)).orderBy(desc(vehicleReports.createdAt));
    })
  }),
  admin: router({
    users: router({
      list: adminProcedure.input(z2.object({ search: z2.string().trim().max(120).optional() }).optional()).query(async ({ input }) => {
        const db = await requireDb();
        const term = input?.search;
        const query = db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn, emailVerifiedAt: users.emailVerifiedAt, phoneVerifiedAt: users.phoneVerifiedAt }).from(users);
        return term ? query.where(or(like(users.email, `%${term}%`), like(users.name, `%${term}%`))).orderBy(desc(users.createdAt)) : query.orderBy(desc(users.createdAt));
      }),
      setRole: adminProcedure.input(z2.object({ id: z2.number().int(), role: z2.enum(["user", "admin"]) })).mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.id && input.role !== "admin") throw new TRPCError4({ code: "BAD_REQUEST", message: "You cannot remove your own admin access." });
        const db = await requireDb();
        await db.update(users).set({ role: input.role }).where(eq4(users.id, input.id));
        await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "user_role_changed", targetType: "user", targetId: input.id, metadata: JSON.stringify({ role: input.role }) });
        return { success: true };
      }),
      remove: adminProcedure.input(z2.object({ id: z2.number().int() })).mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.id) throw new TRPCError4({ code: "BAD_REQUEST", message: "You cannot delete your own account from the admin panel." });
        const db = await requireDb();
        const target = (await db.select({ id: users.id }).from(users).where(eq4(users.id, input.id)).limit(1))[0];
        if (!target) throw new TRPCError4({ code: "NOT_FOUND", message: "User not found." });
        await deleteUserData(db, input.id);
        await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "user_deleted", targetType: "user", targetId: input.id });
        return { success: true };
      })
    }),
    audit: adminProcedure.query(async () => {
      const db = await requireDb();
      return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    }),
    incidents: adminProcedure.query(async () => {
      const db = await requireDb();
      return db.select().from(sosAlerts).orderBy(desc(sosAlerts.createdAt));
    }),
    suspectsList: adminProcedure.query(async () => {
      const db = await requireDb();
      return db.select().from(personOfConcernReports).orderBy(desc(personOfConcernReports.createdAt));
    }),
    vehiclesList: adminProcedure.query(async () => {
      const db = await requireDb();
      return db.select().from(vehicleReports).orderBy(desc(vehicleReports.createdAt));
    })
  })
});

// server/_core/context.ts
import { eq as eq5 } from "drizzle-orm";
function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return void 0;
  const entry = raw.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return entry?.slice(name.length + 1);
}
async function createContext(opts) {
  let user = null;
  if (isSupabaseConfigured()) {
    const authHeader = opts.req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : void 0;
    const token = bearerToken || readCookie(opts.req, "sb_access_token") || readCookie(opts.req, "sb-access-token");
    if (token) {
      const sbUser = await getSupabaseUser(token);
      if (sbUser) {
        let appUser = await getUserByAuthId(sbUser.id);
        if (!appUser && sbUser.email) {
          appUser = await getUserByEmail(sbUser.email);
          if (appUser) {
            const db = await getDb();
            if (db) {
              await db.update(users).set({ authId: sbUser.id }).where(eq5(users.id, appUser.id));
              appUser = await getUserByAuthId(sbUser.id);
            }
          }
        }
        if (!appUser && sbUser.email) {
          const db = await getDb();
          if (db) {
            try {
              await db.insert(users).values({
                authId: sbUser.id,
                openId: `sb-${sbUser.id}`,
                name: sbUser.user_metadata?.name || sbUser.email.split("@")[0] || "User",
                email: sbUser.email,
                phone: sbUser.phone || sbUser.user_metadata?.phone || null,
                loginMethod: "supabase",
                role: "user",
                emailVerifiedAt: sbUser.email_confirmed_at ? new Date(sbUser.email_confirmed_at) : null,
                phoneVerifiedAt: sbUser.phone_confirmed_at ? new Date(sbUser.phone_confirmed_at) : null
              });
              appUser = await getUserByAuthId(sbUser.id);
            } catch (provisionErr) {
              console.error("[Auth] Provisioning error:", provisionErr);
            }
          }
        }
        if (appUser) user = appUser;
      }
    }
  }
  if (!user) {
    const session = parseSessionToken(readCookie(opts.req, "suraksha_session"));
    if (session) {
      const candidate = await requireUserById(session.userId);
      if (candidate && await isUserSessionValid(candidate, session)) user = candidate;
    }
  }
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }
  if (user?.openId) {
    const stored = await getUserByOpenId(user.openId);
    if (stored) user = stored;
  }
  return { req: opts.req, res: opts.res, user };
}

// server/webhooks.ts
import { createHmac as createHmac2, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
import { Router } from "express";
import { eq as eq6 } from "drizzle-orm";
import { Webhook } from "svix";
var router2 = Router();
function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual2(a, b);
}
function computeTwilioSignature(authToken, url, params) {
  const data = Object.keys(params || {}).sort().reduce((value, key) => value + key + params[key], url);
  return createHmac2("sha1", authToken).update(data).digest("base64");
}
function twilioSignature(req) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;
  const signature = String(req.headers["x-twilio-signature"] || "");
  if (!signature) return false;
  const forwardedProto = req.headers["x-forwarded-proto"] || req.protocol;
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const hostUrl = `${protocol}://${req.get("host")}${req.originalUrl}`;
  const hostExpected = computeTwilioSignature(token, hostUrl, req.body || {});
  if (safeEqual(signature, hostExpected)) return true;
  const baseUrl = process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL;
  if (baseUrl) {
    const configuredUrl = `${baseUrl.replace(/\/$/, "")}${req.originalUrl}`;
    const configuredExpected = computeTwilioSignature(token, configuredUrl, req.body || {});
    if (safeEqual(signature, configuredExpected)) return true;
  }
  return false;
}
function mapTwilioStatus(status) {
  if (["queued", "accepted", "sending", "sent"].includes(status)) return "sent";
  if (["delivered", "read"].includes(status)) return "delivered";
  if (["failed", "undelivered"].includes(status)) return "failed";
  return null;
}
async function recalculateIncident2(db, incidentId) {
  const records = await db.select().from(notificationRecords).where(eq6(notificationRecords.incidentId, incidentId));
  if (!records.length) return;
  const status = records.every((record) => record.status === "delivered") ? "delivered" : records.some((record) => record.status === "sent" || record.status === "delivered") ? "sent" : records.every((record) => record.status === "failed") ? "failed" : "pending";
  await db.update(sosAlerts).set({ notificationStatus: status }).where(eq6(sosAlerts.id, incidentId));
}
async function applyProviderStatus(provider, providerMessageId, status, rawEventType, errorMessage) {
  const db = await getDb();
  if (!db) return;
  const record = (await db.select().from(notificationRecords).where(eq6(notificationRecords.providerMessageId, providerMessageId)).limit(1))[0];
  const priorEvent = (await db.select().from(providerWebhookEvents).where(eq6(providerWebhookEvents.providerMessageId, providerMessageId)).limit(1))[0];
  await db.insert(providerWebhookEvents).values({ provider, providerMessageId, status, rawEventType: rawEventType || null }).onConflictDoUpdate({ target: providerWebhookEvents.providerMessageId, set: { status, rawEventType: rawEventType || null } });
  if (!record) return;
  if (priorEvent && record.status === status) return;
  const now = /* @__PURE__ */ new Date();
  await db.update(notificationRecords).set({ status, errorMessage: errorMessage || null, deliveredAt: status === "delivered" ? now : record.deliveredAt, sentAt: status === "sent" || status === "delivered" ? record.sentAt || now : record.sentAt }).where(eq6(notificationRecords.id, record.id));
  await recalculateIncident2(db, record.incidentId);
  await db.insert(incidentTimeline).values({ incidentId: record.incidentId, eventType: `notification_${status}`, message: `${record.channel.toUpperCase()} provider update: ${status}` });
}
router2.post("/twilio/status", async (req, res) => {
  if (!twilioSignature(req)) return res.status(401).json({ error: "Invalid provider signature." });
  const messageId = String(req.body?.MessageSid || req.body?.SmsSid || "");
  const status = mapTwilioStatus(String(req.body?.MessageStatus || req.body?.SmsStatus || ""));
  if (!messageId || !status) return res.status(204).end();
  await applyProviderStatus("twilio", messageId, status, String(req.body?.MessageStatus || ""), req.body?.ErrorCode ? "Provider reported delivery failure." : void 0);
  return res.status(204).end();
});
router2.post("/resend", async (req, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const rawBody = req.rawBody;
  if (!secret || !rawBody) {
    console.warn("[Resend Webhook] Webhook received but RESEND_WEBHOOK_SECRET or rawBody is not available.");
    return res.status(503).json({ error: "Resend webhook verification is not configured." });
  }
  try {
    const wh = new Webhook(secret);
    wh.verify(rawBody, {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"]
    });
  } catch (error) {
    console.error("[Resend Webhook] Signature verification failed:", error?.message || error);
    return res.status(401).json({ error: "Invalid provider signature." });
  }
  const event = req.body;
  const providerMessageId = event.data?.email_id || event.data?.id || event.data?.message_id;
  if (!providerMessageId) {
    console.warn(`[Resend Webhook] Event '${event?.type}' received without provider message identifier.`);
    return res.status(204).end();
  }
  const eventType = event.type || "unknown";
  const status = eventType === "email.delivered" ? "delivered" : ["email.bounced", "email.failed", "email.complained", "email.delivery_delayed"].includes(eventType) ? "failed" : "sent";
  console.log(`[Resend Webhook] Received '${eventType}' for message ID '${providerMessageId}' -> mapped status: '${status}'`);
  await applyProviderStatus("resend", providerMessageId, status, eventType);
  return res.status(204).end();
});
function registerWebhookRoutes(app2) {
  app2.use("/api/webhooks", router2);
}

// server/scheduled.ts
import { timingSafeEqual as timingSafeEqual3 } from "node:crypto";
function verifyCronSecret(req) {
  const configured = process.env.CRON_SECRET;
  if (!configured || configured.length < 16) return false;
  const header = req.headers["x-cron-secret"] || (typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ") ? req.headers.authorization.slice(7) : void 0);
  if (typeof header !== "string") return false;
  const a = Buffer.from(header);
  const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual3(a, b);
}
var lastOpportunisticRun = 0;
var OPPORTUNISTIC_THROTTLE_MS = 3e4;
async function processAllSafetyTasks() {
  const checkIns = await processExpiredCheckIns();
  const delivery = await processDeliveryQueues();
  return { ...checkIns, delivery };
}
async function opportunisticSafetySweep(force = false) {
  const now = Date.now();
  if (!force && now - lastOpportunisticRun < OPPORTUNISTIC_THROTTLE_MS) {
    return null;
  }
  lastOpportunisticRun = now;
  try {
    return await processAllSafetyTasks();
  } catch (err) {
    console.error("[Opportunistic Safety Sweep Error]:", err);
    return null;
  }
}
async function processCheckInSchedule(req, res) {
  try {
    let authorized = verifyCronSecret(req);
    if (!authorized) {
      if (!process.env.CRON_SECRET) {
        console.warn("[Cron] CRON_SECRET is not configured in environment. Set CRON_SECRET in Vercel to protect this endpoint.");
        authorized = true;
      } else if (process.env.NODE_ENV !== "production") {
        authorized = true;
      } else {
        try {
          const user = await sdk.authenticateRequest(req);
          if (user?.isCron && user?.taskUid) authorized = true;
        } catch {
          authorized = false;
        }
      }
    }
    if (!authorized) return res.status(403).json({ error: "cron-only" });
    const result = await processAllSafetyTasks();
    return res.json({ ok: true, ...result, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    console.error("[Scheduled Check-In Error]:", error);
    return res.status(500).json({ error: "scheduled check-in processing failed", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
}

// server/_core/app.ts
function createExpressApp() {
  const app2 = express();
  app2.set("trust proxy", 1);
  app2.disable("x-powered-by");
  app2.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
    res.setHeader("X-Frame-Options", "DENY");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
  app2.use("/api", async (_req, _res, next) => {
    try {
      await opportunisticSafetySweep();
    } catch {
    }
    next();
  });
  app2.use(express.json({
    limit: "50mb",
    verify: (req, _res, buffer) => {
      req.rawBody = Buffer.from(buffer);
    }
  }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  app2.get(["/api/health", "/healthz"], async (_req, res) => {
    const health = await checkDatabaseHealth();
    if (health.ok) {
      return res.status(200).json({
        status: "ok",
        database: "connected",
        tables: health.tableCount ?? 0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return res.status(503).json({
      status: "degraded",
      database: "unavailable",
      message: "Safety services are temporarily unavailable. Please try again.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/api/files/:fileKey", async (req, res) => {
    try {
      const file = await getUploadedFile(req.params.fileKey);
      if (!file) return res.status(404).send("Not found");
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.send(file.fileData);
    } catch (err) {
      console.error("[File Route]", err);
      res.status(500).send("Internal error");
    }
  });
  registerStorageProxy(app2);
  registerOAuthRoutes(app2);
  registerWebhookRoutes(app2);
  app2.get(["/api", "/api/"], (_req, res) => {
    res.status(200).json({ status: "ok", service: "SurakshaShe API" });
  });
  app2.all(["/api/scheduled/process-check-ins", "/api/cron/process-check-ins"], processCheckInSchedule);
  app2.all(["/api/scheduled/process-queues", "/api/cron/process-queues"], async (_req, res) => {
    try {
      const result = await processDeliveryQueues();
      res.status(200).json({ status: "ok", ...result, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (err) {
      console.error("[Cron Delivery Queue Error]:", err);
      res.status(500).json({ status: "error", message: err?.message || "Failed to process queue" });
    }
  });
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app2;
}

// server/serverless.ts
var app = createExpressApp();
function handler(req, res) {
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  return app(req, res);
}
export {
  handler as default
};
