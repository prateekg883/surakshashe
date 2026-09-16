import { and, eq, lte } from "drizzle-orm";
import { auditLogs, checkInPolicies, emergencyContacts, safetyCheckIns, users } from "../drizzle/schema";
import { getDb } from "./db";
import { queueCheckInContact } from "./deliveryQueueService";

function affectedRows(result: unknown) {
  const value = Array.isArray(result) ? result[0] : result;
  return typeof (value as any)?.affectedRows === "number" ? (value as any).affectedRows : 0;
}

export async function processExpiredCheckIns(userId?: number) {
  const db = await getDb();
  if (!db) return { expired: 0, notifications: 0 };
  const now = new Date();
  const candidates = await db.select({ checkIn: safetyCheckIns, policy: checkInPolicies, userName: users.name }).from(safetyCheckIns).leftJoin(checkInPolicies, eq(checkInPolicies.userId, safetyCheckIns.userId)).leftJoin(users, eq(users.id, safetyCheckIns.userId)).where(userId ? and(eq(safetyCheckIns.userId, userId), eq(safetyCheckIns.status, "active")) : eq(safetyCheckIns.status, "active"));
  let expired = 0;
  let notifications = 0;
  for (const candidate of candidates) {
    const graceMinutes = candidate.policy?.graceMinutes ?? 15;
    if (candidate.checkIn.expectedArrival.getTime() + graceMinutes * 60_000 > now.getTime()) continue;
    const updated = await db.update(safetyCheckIns).set({ status: "expired", completedAt: now }).where(and(eq(safetyCheckIns.id, candidate.checkIn.id), eq(safetyCheckIns.status, "active")));
    if (!updated || affectedRows(updated) === 0) continue;
    expired += 1;
    const escalationEnabled = Boolean(candidate.policy?.escalationEnabled);
    if (escalationEnabled) {
      const contacts = await db.select().from(emergencyContacts).where(and(eq(emergencyContacts.userId, candidate.checkIn.userId), eq(emergencyContacts.priority, 1)));
      for (const contact of contacts) {
        const channels = [
          ...(contact.notifySms && contact.phone ? ["sms" as const] : []),
          ...(contact.notifyEmail && contact.email ? ["email" as const] : []),
          ...(contact.notifyWhatsApp && contact.phone ? ["whatsapp" as const] : []),
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
      metadata: JSON.stringify({ escalationEnabled }),
    });
  }
  return { expired, notifications };
}
