import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb, getUserByAuthId, getUserByEmail, getUserByOpenId, isUserSessionValid, parseSessionToken, requireUserById } from "../db";
import { getSupabaseUser, isSupabaseConfigured } from "../supabase";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function readCookie(req: CreateExpressContextOptions["req"], name: string) {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const entry = raw.split(";").map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return entry?.slice(name.length + 1);
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1. Supabase Auth validation
  if (isSupabaseConfigured()) {
    const authHeader = opts.req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
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
              await db.update(users).set({ authId: sbUser.id }).where(eq(users.id, appUser.id));
              appUser = await getUserByAuthId(sbUser.id);
            }
          }
        }
        if (!appUser && sbUser.email) {
          // Provision linked user record
          const db = await getDb();
          if (db) {
            try {
              await db.insert(users).values({
                authId: sbUser.id,
                openId: `sb-${sbUser.id}`,
                name: (sbUser.user_metadata?.name as string) || sbUser.email.split("@")[0] || "User",
                email: sbUser.email,
                phone: (sbUser.phone || sbUser.user_metadata?.phone as string) || null,
                loginMethod: "supabase",
                role: "user",
                emailVerifiedAt: sbUser.email_confirmed_at ? new Date(sbUser.email_confirmed_at) : null,
                phoneVerifiedAt: sbUser.phone_confirmed_at ? new Date(sbUser.phone_confirmed_at) : null,
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

  // 2. Custom App Session fallback
  if (!user) {
    const session = parseSessionToken(readCookie(opts.req, "suraksha_session"));
    if (session) {
      const candidate = await requireUserById(session.userId);
      if (candidate && await isUserSessionValid(candidate, session)) user = candidate;
    }
  }

  // 3. SDK authentication
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  // Preserve compatibility with users authenticated by OAuth.
  if (user?.openId) {
    const stored = await getUserByOpenId(user.openId);
    if (stored) user = stored;
  }

  return { req: opts.req, res: opts.res, user };
}
