import { and, desc, eq, inArray, isNull, like, or } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  auditLogs,
  accountDeletionRequests,
  checkInEscalations,
  fileUploads,
  personOfConcernReports,
  vehicleReports,
  checkInPolicies,
  emergencyContacts,
  incidentAcknowledgements,
  incidentTimeline,
  notificationRecords,
  passwordResetTokens,
  providerWebhookEvents,
  safetyCheckIns,
  sosAlerts,
  users,
  verificationTokens,
  emergencyAccessTokens,
  userSessions,
  sosEscalationPolicies,
} from "../drizzle/schema";
import {
  createSecureToken,
  createUserSession,
  getDb,
  getUserByAuthId,
  getUserByEmail,
  getUserByPhone,
  hashPassword,
  hashSecureToken,
  verifyPassword,
} from "./db";
import { getSupabaseAdmin, getSupabaseAnonClient, isSupabaseConfigured } from "./supabase";
import { saveUploadedFile } from "./storage";
import { cleanPhoneNumber, isEmailConfigured, sendPasswordResetEmail, sendVerificationNotification } from "./notificationService";
import { assertRateLimit, requestIp } from "./rateLimit";
import { processExpiredCheckIns } from "./checkInService";
import { processDeliveryQueues, processSosEscalations, queueSosPriority, triggerDeliveryWorkerImmediate } from "./deliveryQueueService";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";

const requireDb = async () => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The safety database is temporarily unavailable." });
  return db;
};

function assertActionLimit(key: string, limit: number, windowMs: number, message?: string) {
  try {
    assertRateLimit(key, limit, windowMs);
  } catch {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: message || "Too many attempts. Please try again later." });
  }
}

function affectedRows(result: unknown) {
  const value = Array.isArray(result) ? result[0] : result;
  return typeof (value as any)?.affectedRows === "number" ? (value as any).affectedRows : 0;
}

async function setAppSession(ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: any }, user: { id: number; sessionVersion: number }) {
  const token = await createUserSession(user);
  const cookieOptions = getSessionCookieOptions(ctx.req);
  // The local password session is same-site; the separate OAuth cookie keeps
  // its cross-site setting for the hosted login flow.
  ctx.res.cookie("suraksha_session", token, { ...cookieOptions, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });
}

function publicUser(user: any) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, emailVerifiedAt: user.emailVerifiedAt, phoneVerifiedAt: user.phoneVerifiedAt };
}

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL || "";
}

function protectAuthAttempt(ctx: { req: { ip?: string; headers: Record<string, unknown> } }, action: string, email: string) {
  try {
    assertRateLimit(`${action}:${requestIp(ctx.req)}:${email.toLowerCase()}`, action === "login" ? 10 : 5, action === "login" ? 15 * 60 * 1000 : 60 * 60 * 1000);
  } catch {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." });
  }
}

function verificationCode() {
  return String(100000 + (randomBytes(3).readUIntBE(0, 3) % 900000));
}

async function createVerification(db: any, userId: number, kind: "email" | "phone", destination: string, contactId?: number) {
  const code = verificationCode();
  await db.insert(verificationTokens).values({ userId, contactId: contactId ?? null, kind, destination, tokenHash: hashSecureToken(code), expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
  return { code, result: await sendVerificationNotification(kind, destination, code) };
}

async function deleteUserData(db: any, userId: number) {
  const remove = async (tx: any) => {
    const alerts = await tx.select({ id: sosAlerts.id }).from(sosAlerts).where(eq(sosAlerts.userId, userId));
    for (const alert of alerts) {
      await tx.delete(notificationRecords).where(eq(notificationRecords.incidentId, alert.id));
      await tx.delete(incidentTimeline).where(eq(incidentTimeline.incidentId, alert.id));
      await tx.delete(incidentAcknowledgements).where(eq(incidentAcknowledgements.incidentId, alert.id));
      await tx.delete(emergencyAccessTokens).where(eq(emergencyAccessTokens.incidentId, alert.id));
    }
    const checkIns = await tx.select({ id: safetyCheckIns.id }).from(safetyCheckIns).where(eq(safetyCheckIns.userId, userId));
    for (const checkIn of checkIns) await tx.delete(checkInEscalations).where(eq(checkInEscalations.checkInId, checkIn.id));
    await tx.delete(sosAlerts).where(eq(sosAlerts.userId, userId));
    await tx.delete(emergencyContacts).where(eq(emergencyContacts.userId, userId));
    await tx.delete(safetyCheckIns).where(eq(safetyCheckIns.userId, userId));
    await tx.delete(checkInPolicies).where(eq(checkInPolicies.userId, userId));
    await tx.delete(sosEscalationPolicies).where(eq(sosEscalationPolicies.userId, userId));
    await tx.delete(userSessions).where(eq(userSessions.userId, userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx.delete(verificationTokens).where(eq(verificationTokens.userId, userId));
    await tx.delete(auditLogs).where(eq(auditLogs.actorUserId, userId));
    await tx.delete(accountDeletionRequests).where(eq(accountDeletionRequests.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  };
  if (typeof db.transaction === "function") await db.transaction(remove);
  else await remove(db);
}

async function addTimeline(db: any, incidentId: number, eventType: string, message: string) {
  await db.insert(incidentTimeline).values({ incidentId, eventType, message });
}

async function getIncidentByToken(db: any, token: string) {
  const hash = hashSecureToken(token);
  const rows = await db.select({ alert: sosAlerts, userName: users.name, userPhone: users.phone }).from(sosAlerts).leftJoin(users, eq(sosAlerts.userId, users.id)).where(eq(sosAlerts.emergencyTokenHash, hash)).limit(1);
  if (rows[0]) {
    const row = rows[0];
    if (row.alert.emergencyTokenRevokedAt || !row.alert.emergencyTokenExpiresAt || row.alert.emergencyTokenExpiresAt.getTime() <= Date.now()) return null;
    return row;
  }
  const access = (await db.select({ token: emergencyAccessTokens, alert: sosAlerts, userName: users.name, userPhone: users.phone })
    .from(emergencyAccessTokens)
    .innerJoin(sosAlerts, eq(emergencyAccessTokens.incidentId, sosAlerts.id))
    .leftJoin(users, eq(sosAlerts.userId, users.id))
    .where(eq(emergencyAccessTokens.tokenHash, hash)).limit(1))[0];
  if (!access || access.token.revokedAt || access.token.expiresAt.getTime() <= Date.now() || access.alert.emergencyTokenRevokedAt) return null;
  return { alert: access.alert, userName: access.userName, userPhone: access.userPhone };
}

async function markIncidentSafe(db: any, userId: number, incidentId: number, note?: string) {
  const alert = (await db.select().from(sosAlerts).where(and(eq(sosAlerts.id, incidentId), eq(sosAlerts.userId, userId), inArray(sosAlerts.status, ["active", "acknowledged"]))).limit(1))[0];
  if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "Active incident not found." });
  const now = new Date();
  await db.update(sosAlerts).set({ status: "resolved", safeMarkedAt: now, resolvedAt: now, resolutionNote: note || "User marked themselves safe.", emergencyTokenRevokedAt: now }).where(eq(sosAlerts.id, incidentId));
  await db.update(emergencyAccessTokens).set({ revokedAt: now }).where(eq(emergencyAccessTokens.incidentId, incidentId));
  await addTimeline(db, incidentId, "safe_marked", "User marked themselves safe");
  return { success: true } as const;
}

const strongPassword = z.string().min(8).max(128).refine(value => /[A-Za-z]/.test(value) && /\d/.test(value), "Use at least 8 characters with a letter and a number.");
const phoneNumber = z.string().trim().regex(/^\+?[1-9][0-9\s().-]{5,31}$/, "Enter a valid phone number.");
const registrationInput = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), phone: phoneNumber, password: strongPassword });
const contactInput = z.object({ name: z.string().trim().min(2).max(120), phone: phoneNumber, email: z.string().trim().email().max(320).optional().or(z.literal("")), relationship: z.string().trim().max(120).optional(), priority: z.number().int().min(1).max(5).default(1), notifySms: z.boolean().default(true), notifyEmail: z.boolean().default(true), notifyWhatsApp: z.boolean().default(false) });

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(({ ctx }) => (ctx.user ? publicUser(ctx.user) : null)),
    register: publicProcedure.input(registrationInput).mutation(async ({ ctx, input }) => {
      protectAuthAttempt(ctx, "register", input.email);
      const db = await requireDb();
      const email = input.email.toLowerCase().trim();
      if (await getUserByEmail(email)) throw new TRPCError({ code: "BAD_REQUEST", message: "An account with this email already exists." });
      if (await getUserByPhone(input.phone)) throw new TRPCError({ code: "BAD_REQUEST", message: "An account with this phone number already exists." });

      let authId: string | null = null;
      if (isSupabaseConfigured()) {
        try {
          const admin = getSupabaseAdmin();
          const { data, error } = await admin.auth.admin.createUser({
            email,
            password: input.password,
            email_confirm: true,
            user_metadata: { name: input.name, phone: input.phone },
          });
          if (error) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          authId = data.user?.id ?? null;
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;
          console.error("[Supabase Register Error]:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error?.message || "Failed to create authentication user." });
        }
      }

      const openId = authId ? `sb-${authId}` : `local-${randomBytes(20).toString("hex")}`;
      try {
        await db.insert(users).values({
          authId,
          openId,
          name: input.name,
          email,
          phone: input.phone,
          passwordHash: await hashPassword(input.password),
          loginMethod: isSupabaseConfigured() ? "supabase" : "password",
          role: "user",
        });
      } catch (error: any) {
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
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Account creation failed due to a database error." });
      }

      const user = await getUserByEmail(email);
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Account creation failed." });

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
              maxAge: 30 * 24 * 60 * 60 * 1000,
            });
          }
        } catch (sessionErr) {
          console.warn("[Register] Could not set Supabase session cookie:", sessionErr);
        }
      }

      await setAppSession(ctx, user);
      return publicUser(user);
    }),
    login: publicProcedure.input(z.object({ email: z.string().trim().email(), password: z.string().min(1) })).mutation(async ({ ctx, input }) => {
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
                maxAge: 30 * 24 * 60 * 60 * 1000,
              });
            }
            if (user && !user.authId) {
              const db = await requireDb();
              await db.update(users).set({ authId: data.user.id, loginMethod: "supabase" }).where(eq(users.id, user.id));
              user.authId = data.user.id;
            }
          }
        } catch (sbErr) {
          console.warn("[Supabase Login] Direct signInWithPassword failed, testing fallback:", sbErr);
        }

        if (!sbLoggedIn) {
          if (user?.passwordHash && (await verifyPassword(input.password, user.passwordHash))) {
            try {
              const admin = getSupabaseAdmin();
              const { data: createdUser } = await admin.auth.admin.createUser({
                email,
                password: input.password,
                email_confirm: true,
                user_metadata: { name: user.name, phone: user.phone },
              });
              if (createdUser?.user) {
                const db = await requireDb();
                await db.update(users).set({ authId: createdUser.user.id, loginMethod: "supabase" }).where(eq(users.id, user.id));
                user.authId = createdUser.user.id;
              }
            } catch (migrateErr) {
              console.warn("[Auth Migration] Error migrating user to Supabase Auth:", migrateErr);
            }
          } else {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
          }
        }
      } else {
        if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }
      }

      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "User account not found." });
      const db = await requireDb();
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
      await setAppSession(ctx, user);
      return publicUser({ ...user, lastSignedIn: new Date() });
    }),
    requestPasswordReset: publicProcedure.input(z.object({ email: z.string().trim().email() })).mutation(async ({ ctx, input }) => {
      protectAuthAttempt(ctx, "reset", input.email);
      const email = input.email.toLowerCase().trim();
      const base = appBaseUrl() || "http://localhost:3000";

      if (isSupabaseConfigured()) {
        try {
          const admin = getSupabaseAdmin();
          const resetUrl = `${base.replace(/\/$/, "")}/reset-password`;
          const { error } = await admin.auth.resetPasswordForEmail(email, {
            redirectTo: resetUrl,
          });
          if (error) {
            console.warn("[Supabase Reset Password] Error requesting reset:", error);
          } else {
            console.log(`[Supabase Reset Password] Sent reset email for ${email}`);
            return { success: true, status: "sent" } as const;
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
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: isDev ? devMsg : prodMsg });
      }

      const isProd = process.env.NODE_ENV === "production";
      if (isProd && (!base || !base.startsWith("https://"))) {
        const msg = "Server configuration error: APP_BASE_URL must use HTTPS in production.";
        console.error(`[Password Reset] ${msg}`);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }

      const user = await getUserByEmail(email);
      if (user?.email) {
        const rawToken = createSecureToken();
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash: hashSecureToken(rawToken),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });

        const resetBase = base || "http://localhost:3000";
        const link = `${resetBase.replace(/\/$/, "")}/reset-password/${encodeURIComponent(rawToken)}`;
        console.log(`[Password Reset] Generated reset token for user ID ${user.id}. Dispatching email via Resend...`);

        const delivery = await sendPasswordResetEmail(user.email, link);
        if (delivery.status === "failed") {
          console.error(`[Password Reset] Delivery failed for user ID ${user.id}: ${delivery.errorMessage}`);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: delivery.errorMessage || "Email provider failed to accept the reset message.",
          });
        }

        console.log(`[Password Reset] Email accepted by provider for user ID ${user.id}. Provider Message ID: ${delivery.providerMessageId}`);
        return { success: true, status: "sent", providerMessageId: delivery.providerMessageId } as const;
      } else {
        console.log(`[Password Reset] Request received for unverified/non-existent email (returning privacy-preserving response).`);
        return { success: true, status: "accepted" } as const;
      }
    }),
    resetPassword: publicProcedure.input(z.object({ token: z.string().min(32).max(100), password: strongPassword })).mutation(async ({ input }) => {
      const db = await requireDb();
      const tokenHash = hashSecureToken(input.token);
      const tokenRow = (await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).limit(1))[0];
      if (!tokenRow || tokenRow.usedAt || tokenRow.expiresAt.getTime() < Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or expired." });
      const resetUser = (await db.select({ sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, tokenRow.userId)).limit(1))[0];
      if (!resetUser) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or expired." });
      const claimed = await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.id, tokenRow.id), isNull(passwordResetTokens.usedAt)));
      if (affectedRows(claimed) === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or expired." });
      await db.update(users).set({ passwordHash: await hashPassword(input.password), sessionVersion: resetUser.sessionVersion + 1 }).where(eq(users.id, tokenRow.userId));
      await db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.userId, tokenRow.userId));
      console.log(`[Password Reset] Successfully updated password for user ID ${tokenRow.userId} and revoked all active sessions.`);
      return { success: true } as const;
    }),
    requestVerification: protectedProcedure.input(z.object({ kind: z.enum(["email", "phone"]) })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`auth-req-verify:${ctx.user.id}`, 5, 15 * 60 * 1000, "Too many verification requests. Please wait before trying again.");
      const db = await requireDb();
      const destination = input.kind === "email" ? ctx.user.email : ctx.user.phone;
      if (!destination) throw new TRPCError({ code: "BAD_REQUEST", message: `Add a ${input.kind} before requesting verification.` });
      const delivery = await createVerification(db, ctx.user.id, input.kind, destination);
      return { status: delivery.result.status, message: delivery.result.status === "failed" ? delivery.result.errorMessage : "Verification code sent." };
    }),
    verify: protectedProcedure.input(z.object({ kind: z.enum(["email", "phone"]), code: z.string().regex(/^\d{6}$/) })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`auth-verify:${ctx.user.id}`, 6, 15 * 60 * 1000, "Too many verification attempts. Please request a new code later.");
      const db = await requireDb();
      const rows = await db.select().from(verificationTokens).where(and(eq(verificationTokens.userId, ctx.user.id), eq(verificationTokens.kind, input.kind), eq(verificationTokens.tokenHash, hashSecureToken(input.code)))).orderBy(desc(verificationTokens.id)).limit(1);
      const token = rows[0];
      if (!token || token.usedAt || token.expiresAt.getTime() < Date.now() || token.contactId) throw new TRPCError({ code: "BAD_REQUEST", message: "That verification code is invalid or expired." });
      await db.update(verificationTokens).set({ usedAt: new Date() }).where(eq(verificationTokens.id, token.id));
      await db.update(users).set(input.kind === "email" ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() }).where(eq(users.id, ctx.user.id));
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const rawCookie = typeof ctx.req.headers.cookie === "string" ? ctx.req.headers.cookie.split(";").map(value => value.trim()).find(value => value.startsWith("suraksha_session="))?.slice("suraksha_session=".length) : undefined;
      if (rawCookie) {
        const parts = rawCookie.split(".");
        const sessionId = parts.length === 5 ? parts[3] : undefined;
        if (sessionId) {
          const db = await getDb();
          if (db) await db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.sessionIdHash, hashSecureToken(sessionId)));
        }
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("suraksha_session", { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("sb_access_token", { path: "/", maxAge: -1 });
      ctx.res.clearCookie("sb-access-token", { path: "/", maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  contacts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, ctx.user.id)).orderBy(emergencyContacts.priority, desc(emergencyContacts.createdAt));
    }),
    create: protectedProcedure.input(contactInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const cleanPhone = cleanPhoneNumber(input.phone);
      const normalizedEmail = input.email ? input.email.trim().toLowerCase() : null;
      const existingPhone = (await db.select({ id: emergencyContacts.id }).from(emergencyContacts).where(and(eq(emergencyContacts.userId, ctx.user.id), eq(emergencyContacts.phone, cleanPhone))).limit(1))[0];
      if (existingPhone) throw new TRPCError({ code: "BAD_REQUEST", message: "A trusted contact with this phone number already exists." });
      if (normalizedEmail) {
        const existingEmail = (await db.select({ id: emergencyContacts.id }).from(emergencyContacts).where(and(eq(emergencyContacts.userId, ctx.user.id), eq(emergencyContacts.email, normalizedEmail))).limit(1))[0];
        if (existingEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "A trusted contact with this email address already exists." });
      }
      await db.insert(emergencyContacts).values({ userId: ctx.user.id, ...input, phone: cleanPhone, email: normalizedEmail, relationship: input.relationship || null });
      const rows = await db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, ctx.user.id)).orderBy(desc(emergencyContacts.id)).limit(1);
      return rows[0];
    }),
    update: protectedProcedure.input(contactInput.extend({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = await db.select().from(emergencyContacts).where(and(eq(emergencyContacts.id, input.id), eq(emergencyContacts.userId, ctx.user.id))).limit(1);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found." });
      const cleanPhone = cleanPhoneNumber(input.phone);
      const normalizedEmail = input.email ? input.email.trim().toLowerCase() : null;
      const conflictPhone = await db.select({ id: emergencyContacts.id }).from(emergencyContacts).where(and(eq(emergencyContacts.userId, ctx.user.id), eq(emergencyContacts.phone, cleanPhone))).limit(2);
      if (conflictPhone.some((c: any) => c.id !== input.id)) throw new TRPCError({ code: "BAD_REQUEST", message: "Another trusted contact already has this phone number." });
      if (normalizedEmail) {
        const conflictEmail = await db.select({ id: emergencyContacts.id }).from(emergencyContacts).where(and(eq(emergencyContacts.userId, ctx.user.id), eq(emergencyContacts.email, normalizedEmail))).limit(2);
        if (conflictEmail.some((c: any) => c.id !== input.id)) throw new TRPCError({ code: "BAD_REQUEST", message: "Another trusted contact already has this email address." });
      }
      await db.update(emergencyContacts).set({ name: input.name, phone: cleanPhone, email: normalizedEmail, relationship: input.relationship || null, priority: input.priority, notifySms: input.notifySms, notifyEmail: input.notifyEmail, notifyWhatsApp: input.notifyWhatsApp, phoneVerifiedAt: existing[0].phone === cleanPhone ? existing[0].phoneVerifiedAt : null, emailVerifiedAt: existing[0].email === normalizedEmail ? existing[0].emailVerifiedAt : null }).where(eq(emergencyContacts.id, input.id));
      return { success: true } as const;
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.delete(emergencyContacts).where(and(eq(emergencyContacts.id, input.id), eq(emergencyContacts.userId, ctx.user.id)));
      return { success: true } as const;
    }),
    requestVerification: protectedProcedure.input(z.object({ id: z.number().int(), kind: z.enum(["email", "phone"]) })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`contact-req-verify:${ctx.user.id}:${input.id}`, 5, 15 * 60 * 1000, "Too many verification requests for this contact.");
      const db = await requireDb();
      const contact = (await db.select().from(emergencyContacts).where(and(eq(emergencyContacts.id, input.id), eq(emergencyContacts.userId, ctx.user.id))).limit(1))[0];
      if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found." });
      const destination = input.kind === "email" ? contact.email : contact.phone;
      if (!destination) throw new TRPCError({ code: "BAD_REQUEST", message: `This contact has no ${input.kind} address.` });
      const delivery = await createVerification(db, ctx.user.id, input.kind, destination, contact.id);
      return { status: delivery.result.status, message: delivery.result.status === "failed" ? delivery.result.errorMessage : "Verification code sent." };
    }),
    verify: protectedProcedure.input(z.object({ id: z.number().int(), kind: z.enum(["email", "phone"]), code: z.string().regex(/^\d{6}$/) })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`contact-verify:${ctx.user.id}:${input.id}`, 6, 15 * 60 * 1000, "Too many verification attempts for this contact.");
      const db = await requireDb();
      const contact = (await db.select().from(emergencyContacts).where(and(eq(emergencyContacts.id, input.id), eq(emergencyContacts.userId, ctx.user.id))).limit(1))[0];
      if (!contact) throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found." });
      const token = (await db.select().from(verificationTokens).where(and(eq(verificationTokens.userId, ctx.user.id), eq(verificationTokens.contactId, input.id), eq(verificationTokens.kind, input.kind), eq(verificationTokens.tokenHash, hashSecureToken(input.code)))).orderBy(desc(verificationTokens.id)).limit(1))[0];
      if (!token || token.usedAt || token.expiresAt.getTime() < Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "That verification code is invalid or expired." });
      await db.update(verificationTokens).set({ usedAt: new Date() }).where(eq(verificationTokens.id, token.id));
      await db.update(emergencyContacts).set(input.kind === "email" ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() }).where(eq(emergencyContacts.id, input.id));
      return { success: true } as const;
    }),
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
      return db.select().from(sosAlerts).where(eq(sosAlerts.userId, ctx.user.id)).orderBy(desc(sosAlerts.createdAt));
    }),
    policy: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const policy = (await db.select().from(sosEscalationPolicies).where(eq(sosEscalationPolicies.userId, ctx.user.id)).limit(1))[0];
      return policy || { acknowledgementWaitMinutes: 5 };
    }),
    updatePolicy: protectedProcedure.input(z.object({ acknowledgementWaitMinutes: z.number().int().min(1).max(1440) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.insert(sosEscalationPolicies).values({ userId: ctx.user.id, acknowledgementWaitMinutes: input.acknowledgementWaitMinutes }).onConflictDoUpdate({ target: sosEscalationPolicies.userId, set: { acknowledgementWaitMinutes: input.acknowledgementWaitMinutes } });
      return { success: true } as const;
    }),
    detail: protectedProcedure.input(z.object({ id: z.number().int() })).query(async ({ ctx, input }) => {
      const db = await requireDb();
      const alert = (await db.select().from(sosAlerts).where(and(eq(sosAlerts.id, input.id), eq(sosAlerts.userId, ctx.user.id))).limit(1))[0];
      if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
      const [timeline, notifications, acknowledgements] = await Promise.all([
        db.select().from(incidentTimeline).where(eq(incidentTimeline.incidentId, alert.id)).orderBy(incidentTimeline.createdAt),
        db.select().from(notificationRecords).where(eq(notificationRecords.incidentId, alert.id)).orderBy(notificationRecords.createdAt),
        db.select().from(incidentAcknowledgements).where(eq(incidentAcknowledgements.incidentId, alert.id)).orderBy(incidentAcknowledgements.createdAt),
      ]);
      return { alert, timeline, notifications, acknowledgements };
    }),
    create: protectedProcedure.input(z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180), accuracy: z.number().finite().min(0).max(100000).optional(), address: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`sos-create:${ctx.user.id}`, 2, 5000, "Please wait a moment before sending another SOS.");
      const db = await requireDb();
      const active = await db.select({ id: sosAlerts.id }).from(sosAlerts).where(and(eq(sosAlerts.userId, ctx.user.id), inArray(sosAlerts.status, ["active", "acknowledged"]))).limit(1);
      if (active[0]) throw new TRPCError({ code: "CONFLICT", message: "You already have an active SOS. Mark yourself safe before starting another." });
      const rawToken = createSecureToken();
      const now = new Date();
      const policy = (await db.select().from(sosEscalationPolicies).where(eq(sosEscalationPolicies.userId, ctx.user.id)).limit(1))[0];
      const waitMinutes = policy?.acknowledgementWaitMinutes ?? 5;
      await db.insert(sosAlerts).values({ userId: ctx.user.id, latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy ?? null, address: input.address || null, initialLatitude: input.latitude, initialLongitude: input.longitude, initialAccuracy: input.accuracy ?? null, lastLocationAt: now, emergencyTokenHash: hashSecureToken(rawToken), emergencyTokenExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), notificationStatus: "pending", activatedAt: now, nextEscalationAt: new Date(now.getTime() + waitMinutes * 60_000) });
      const alert = (await db.select().from(sosAlerts).where(and(eq(sosAlerts.userId, ctx.user.id), eq(sosAlerts.emergencyTokenHash, hashSecureToken(rawToken)))).limit(1))[0];
      if (!alert) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Incident could not be created." });
      await addTimeline(db, alert.id, "activated", "SOS activated");
      await addTimeline(db, alert.id, "location_captured", "Location captured");
      await addTimeline(db, alert.id, "incident_created", "Emergency incident created");
      const queued = await queueSosPriority(db, alert.id, ctx.user.id, 1);
      if (!queued) {
        const contacts = await db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, ctx.user.id));
        const hasFutureChannel = contacts.some((contact: any) => contact.priority > 1 && ((contact.notifySms && contact.phone) || (contact.notifyEmail && contact.email) || (contact.notifyWhatsApp && contact.phone)));
        if (hasFutureChannel) await addTimeline(db, alert.id, "notification_pending", "No priority-1 notification channels are configured; escalation will continue to the next priority.");
        else {
          await db.update(sosAlerts).set({ notificationStatus: "failed" }).where(eq(sosAlerts.id, alert.id));
          await addTimeline(db, alert.id, "notification_failed", "No configured notification channels are available.");
        }
      }
      await triggerDeliveryWorkerImmediate();
      const currentAlert = (await db.select().from(sosAlerts).where(eq(sosAlerts.id, alert.id)).limit(1))[0] || alert;
      return { alert: currentAlert, emergencyLink: appBaseUrl() ? `${appBaseUrl()}/emergency/${encodeURIComponent(rawToken)}` : `/emergency/${encodeURIComponent(rawToken)}` };
    }),
    updateLocation: protectedProcedure.input(z.object({ id: z.number().int(), latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180), accuracy: z.number().finite().min(0).max(100000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const alert = (await db.select().from(sosAlerts).where(and(eq(sosAlerts.id, input.id), eq(sosAlerts.userId, ctx.user.id), inArray(sosAlerts.status, ["active", "acknowledged"]))).limit(1))[0];
      if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "Active incident not found." });
      const now = new Date();
      await db.update(sosAlerts).set({ latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy ?? null, lastLocationAt: now }).where(eq(sosAlerts.id, input.id));
      await addTimeline(db, input.id, "location_updated", "Live location updated");
      return { success: true, updatedAt: now } as const;
    }),
    markSafe: protectedProcedure.input(z.object({ id: z.number().int(), note: z.string().trim().max(240).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      return markIncidentSafe(db, ctx.user.id, input.id, input.note);
    }),
    resolve: protectedProcedure.input(z.object({ id: z.number().int(), note: z.string().trim().max(240).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      return markIncidentSafe(db, ctx.user.id, input.id, input.note);
    }),
    cancel: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const now = new Date();
      const alert = (await db.select({ id: sosAlerts.id }).from(sosAlerts).where(and(eq(sosAlerts.id, input.id), eq(sosAlerts.userId, ctx.user.id), inArray(sosAlerts.status, ["active", "acknowledged"]))).limit(1))[0];
      if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "Active incident not found." });
      await db.update(sosAlerts).set({ status: "cancelled", emergencyTokenRevokedAt: now, nextEscalationAt: null }).where(eq(sosAlerts.id, input.id));
      await db.update(emergencyAccessTokens).set({ revokedAt: now }).where(eq(emergencyAccessTokens.incidentId, input.id));
      await addTimeline(db, input.id, "cancelled", "SOS cancelled by user");
      return { success: true } as const;
    }),
  }),

  emergency: router({
    view: publicProcedure.input(z.object({ token: z.string().min(32).max(100) })).query(async ({ input }) => {
      const db = await requireDb();
      try {
        await processSosEscalations();
        await processDeliveryQueues();
      } catch (err) {
        console.error("[Emergency Escalation Query Error]:", err);
      }
      const row = await getIncidentByToken(db, input.token);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "This emergency link is invalid, expired, or revoked." });
      const rawTimeline = await db.select().from(incidentTimeline).where(eq(incidentTimeline.incidentId, row.alert.id)).orderBy(incidentTimeline.createdAt);
      const publicAllowedEvents = new Set(["activated", "location_captured", "location_updated", "contact_acknowledged", "contact_responding", "safe_marked", "cancelled", "incident_created"]);
      const timeline = rawTimeline
        .filter((event: any) => publicAllowedEvents.has(event.eventType))
        .map((event: any) => ({ id: event.id, eventType: event.eventType, message: event.message, createdAt: event.createdAt }));
      const alert = {
        id: row.alert.id,
        status: row.alert.status,
        latitude: row.alert.latitude,
        longitude: row.alert.longitude,
        accuracy: row.alert.accuracy,
        address: row.alert.address,
        activatedAt: row.alert.activatedAt,
        lastLocationAt: row.alert.lastLocationAt,
        createdAt: row.alert.createdAt,
      };
      return { alert, userName: row.userName, userPhone: row.userPhone, timeline, emergencyNumber: "112" };
    }),
    acknowledge: publicProcedure.input(z.object({ token: z.string().min(32).max(100), contactName: z.string().trim().min(2).max(120), contactPhone: phoneNumber, response: z.enum(["acknowledged", "responding"]) })).mutation(async ({ ctx, input }) => {
      assertActionLimit(`emergency-ack:${requestIp(ctx.req)}:${input.token.slice(0, 16)}`, 10, 15 * 60 * 1000, "Too many response attempts. Please try again later.");
      const db = await requireDb();
      const row = await getIncidentByToken(db, input.token);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "This emergency link is invalid, expired, or revoked." });
      if (row.alert.status === "resolved" || row.alert.status === "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `This incident has already been ${row.alert.status}.` });
      }
      const cleanInputPhone = cleanPhoneNumber(input.contactPhone);
      const normalizedInputName = input.contactName.trim().toLowerCase();
      const contacts = await db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, row.alert.userId));
      const contact = contacts.find((c: any) => cleanPhoneNumber(c.phone) === cleanInputPhone && c.name.trim().toLowerCase() === normalizedInputName);
      if (!contact) throw new TRPCError({ code: "FORBIDDEN", message: "We could not match those details to a trusted contact." });
      const existing = (await db.select({ id: incidentAcknowledgements.id }).from(incidentAcknowledgements).where(and(eq(incidentAcknowledgements.incidentId, row.alert.id), eq(incidentAcknowledgements.contactId, contact.id))).limit(1))[0];
      if (!existing) {
        await db.insert(incidentAcknowledgements).values({ incidentId: row.alert.id, contactId: contact.id, response: input.response });
        await addTimeline(db, row.alert.id, `contact_${input.response}`, `${contact.name} marked themselves ${input.response}`);
      } else {
        await db.update(incidentAcknowledgements).set({ response: input.response }).where(eq(incidentAcknowledgements.id, existing.id));
        await addTimeline(db, row.alert.id, `contact_${input.response}`, `${contact.name} updated response to ${input.response}`);
      }
      if (row.alert.status === "active") await db.update(sosAlerts).set({ status: "acknowledged", nextEscalationAt: null }).where(and(eq(sosAlerts.id, row.alert.id), eq(sosAlerts.status, "active")));
      return { success: true } as const;
    }),
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
      return db.select().from(safetyCheckIns).where(eq(safetyCheckIns.userId, ctx.user.id)).orderBy(desc(safetyCheckIns.createdAt));
    }),
    policy: protectedProcedure.query(async ({ ctx }) => { const db = await requireDb(); const policy = (await db.select().from(checkInPolicies).where(eq(checkInPolicies.userId, ctx.user.id)).limit(1))[0]; return policy || { escalationEnabled: false, graceMinutes: 15 }; }),
    updatePolicy: protectedProcedure.input(z.object({ escalationEnabled: z.boolean(), graceMinutes: z.number().int().min(5).max(1440) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.insert(checkInPolicies).values({ userId: ctx.user.id, escalationEnabled: input.escalationEnabled, graceMinutes: input.graceMinutes }).onConflictDoUpdate({ target: checkInPolicies.userId, set: { escalationEnabled: input.escalationEnabled, graceMinutes: input.graceMinutes } });
      return { success: true } as const;
    }),
    processExpired: protectedProcedure.mutation(async ({ ctx }) => processExpiredCheckIns(ctx.user.id)),
    create: protectedProcedure.input(z.object({ message: z.string().trim().min(2).max(240), expectedArrival: z.coerce.date(), reminderAt: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
      if (input.expectedArrival.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Expected arrival must be in the future." });
      const db = await requireDb();
      await db.insert(safetyCheckIns).values({ userId: ctx.user.id, message: input.message, expectedArrival: input.expectedArrival, reminderAt: input.reminderAt ?? null });
      return { success: true } as const;
    }),
    markSafe: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const result = await db.update(safetyCheckIns).set({ status: "safe", completedAt: new Date() }).where(and(eq(safetyCheckIns.id, input.id), eq(safetyCheckIns.userId, ctx.user.id), eq(safetyCheckIns.status, "active")));
      if (affectedRows(result) === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Active check-in not found." });
      return { success: true } as const;
    }),
    cancel: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => { const db = await requireDb(); const result = await db.update(safetyCheckIns).set({ status: "cancelled", completedAt: new Date() }).where(and(eq(safetyCheckIns.id, input.id), eq(safetyCheckIns.userId, ctx.user.id), eq(safetyCheckIns.status, "active"))); if (affectedRows(result) === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Active check-in not found." }); return { success: true } as const; }),
  }),

  privacy: router({
    exportData: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const [profile, contacts, alerts, checkIns] = await Promise.all([
        db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, createdAt: users.createdAt }).from(users).where(eq(users.id, ctx.user.id)).limit(1),
        db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, ctx.user.id)),
        db.select().from(sosAlerts).where(eq(sosAlerts.userId, ctx.user.id)),
        db.select().from(safetyCheckIns).where(eq(safetyCheckIns.userId, ctx.user.id)),
      ]);
      return { profile: profile[0], contacts, alerts, checkIns, exportedAt: new Date() };
    }),
    deleteAlertHistory: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      const activeAlert = (await db.select({ id: sosAlerts.id }).from(sosAlerts).where(and(eq(sosAlerts.userId, ctx.user.id), inArray(sosAlerts.status, ["active", "acknowledged"]))).limit(1))[0];
      if (activeAlert) throw new TRPCError({ code: "BAD_REQUEST", message: "You have an active SOS incident in progress. Mark yourself safe before clearing history." });
      const alerts = await db.select({ id: sosAlerts.id }).from(sosAlerts).where(eq(sosAlerts.userId, ctx.user.id));
      for (const alert of alerts) {
        await db.delete(notificationRecords).where(eq(notificationRecords.incidentId, alert.id));
        await db.delete(incidentTimeline).where(eq(incidentTimeline.incidentId, alert.id));
        await db.delete(incidentAcknowledgements).where(eq(incidentAcknowledgements.incidentId, alert.id));
        await db.delete(emergencyAccessTokens).where(eq(emergencyAccessTokens.incidentId, alert.id));
      }
      await db.delete(sosAlerts).where(eq(sosAlerts.userId, ctx.user.id));
      return { success: true } as const;
    }),
    deleteAccount: protectedProcedure.input(z.object({ confirmation: z.literal("DELETE MY ACCOUNT") })).mutation(async ({ ctx }) => {
      const db = await requireDb();
      await db.insert(accountDeletionRequests).values({ userId: ctx.user.id, completedAt: new Date() });
      await deleteUserData(db, ctx.user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("suraksha_session", { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),


  file: router({
    upload: protectedProcedure.input(z.object({
      fileName: z.string(),
      mimeType: z.string(),
      base64Data: z.string(),
      context: z.enum(["profile", "evidence", "suspect", "vehicle", "other"]).default("other"),
      contextId: z.number().optional(),
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
        contextId: input.contextId,
      }).returning();
      return { fileKey: record.fileKey, id: record.id };
    }),
  }),

  suspects: router({
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      gender: z.string().optional(),
      ageApprox: z.string().optional(),
      notes: z.string().optional(),
      lastKnownLocation: z.string().optional(),
      observedAt: z.coerce.date().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [report] = await db.insert(personOfConcernReports).values({
        reportedByUserId: ctx.user.id,
        ...input,
      }).returning();
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "suspect_report_created", metadata: JSON.stringify({ reportId: report.id }) });
      return report;
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(personOfConcernReports).where(eq(personOfConcernReports.reportedByUserId, ctx.user.id)).orderBy(desc(personOfConcernReports.createdAt));
    }),
  }),

  vehicles: router({
    create: protectedProcedure.input(z.object({
      registrationNumber: z.string().optional(),
      type: z.string().optional(),
      makeModel: z.string().optional(),
      color: z.string().optional(),
      description: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const normalizedRegistration = input.registrationNumber ? input.registrationNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : undefined;
      const [report] = await db.insert(vehicleReports).values({
        reportedByUserId: ctx.user.id,
        ...input,
        normalizedRegistration,
      }).returning();
      await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "vehicle_report_created", metadata: JSON.stringify({ reportId: report.id }) });
      return report;
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(vehicleReports).where(eq(vehicleReports.reportedByUserId, ctx.user.id)).orderBy(desc(vehicleReports.createdAt));
    }),
  }),

  admin: router({

    users: router({
      list: adminProcedure.input(z.object({ search: z.string().trim().max(120).optional() }).optional()).query(async ({ input }) => {
        const db = await requireDb();
        const term = input?.search;
        const query = db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn, emailVerifiedAt: users.emailVerifiedAt, phoneVerifiedAt: users.phoneVerifiedAt }).from(users);
        return term ? query.where(or(like(users.email, `%${term}%`), like(users.name, `%${term}%`))).orderBy(desc(users.createdAt)) : query.orderBy(desc(users.createdAt));
      }),
      setRole: adminProcedure.input(z.object({ id: z.number().int(), role: z.enum(["user", "admin"]) })).mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.id && input.role !== "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own admin access." });
        const db = await requireDb();
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.id));
        await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "user_role_changed", targetType: "user", targetId: input.id, metadata: JSON.stringify({ role: input.role }) });
        return { success: true } as const;
      }),
      remove: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own account from the admin panel." });
        const db = await requireDb();
        const target = (await db.select({ id: users.id }).from(users).where(eq(users.id, input.id)).limit(1))[0];
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        await deleteUserData(db, input.id);
        await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "user_deleted", targetType: "user", targetId: input.id });
        return { success: true } as const;
      }),
    }),
audit: adminProcedure.query(async () => { const db = await requireDb(); return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100); }),
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
    }),
  }),
});

export type AppRouter = typeof appRouter;
