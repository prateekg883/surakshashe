import { and, eq, gt, lte } from "drizzle-orm";
import {
  checkInEscalations,
  emergencyAccessTokens,
  emergencyContacts,
  incidentTimeline,
  notificationRecords,
  safetyCheckIns,
  sosAlerts,
  sosEscalationPolicies,
  users,
} from "../drizzle/schema";
import { createSecureToken, getDb, hashSecureToken } from "./db";
import { sendContactMessage, sendNotification, type NotificationChannel } from "./notificationService";

const SESSION_LINK_TTL_MS = 24 * 60 * 60 * 1000;
const LOCK_MS = 2 * 60 * 1000;
const DEFAULT_WAIT_MINUTES = 5;
let workerRunning = false;
let workerTimer: NodeJS.Timeout | undefined;

function resultAffectedRows(result: unknown) {
  const candidate = Array.isArray(result) ? result[0] : result;
  return typeof (candidate as any)?.affectedRows === "number" ? (candidate as any).affectedRows : 0;
}

function channelsForContact(contact: typeof emergencyContacts.$inferSelect): NotificationChannel[] {
  const channels: NotificationChannel[] = [];
  if (contact.notifySms && contact.phone) channels.push("sms");
  if (contact.notifyEmail && contact.email) channels.push("email");
  if (contact.notifyWhatsApp && contact.phone) channels.push("whatsapp");
  return channels;
}

function verifiedForChannel(contact: typeof emergencyContacts.$inferSelect, channel: NotificationChannel) {
  return channel === "email" ? Boolean(contact.emailVerifiedAt) : Boolean(contact.phoneVerifiedAt);
}

export function retryAt(attempt: number) {
  const configured = Number(process.env.NOTIFICATION_RETRY_BASE_SECONDS || 15);
  const baseSeconds = Number.isFinite(configured) ? Math.max(5, configured) : 15;
  const delaySeconds = Math.min(15 * 60, baseSeconds * 2 ** Math.max(0, attempt - 1));
  return new Date(Date.now() + delaySeconds * 1000);
}

async function addTimeline(db: any, incidentId: number, eventType: string, message: string) {
  await db.insert(incidentTimeline).values({ incidentId, eventType, message });
}

export async function queueSosPriority(db: any, incidentId: number, userId: number, priority: number) {
  const contacts = await db.select().from(emergencyContacts).where(and(eq(emergencyContacts.userId, userId), eq(emergencyContacts.priority, priority)));
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
        nextAttemptAt: new Date(),
      }).onConflictDoUpdate({ target: notificationRecords.id, set: { idempotencyKey } });
      queued += 1;
    }
  }
  return queued;
}

export async function queueCheckInContact(db: any, checkInId: number, contact: typeof emergencyContacts.$inferSelect, channel: NotificationChannel) {
  const idempotencyKey = `check-in/${checkInId}/contact/${contact.id}/${channel}`;
  await db.insert(checkInEscalations).values({
    checkInId,
    contactId: contact.id,
    channel,
    idempotencyKey,
    status: "pending",
    nextAttemptAt: new Date(),
  }).onConflictDoUpdate({ target: notificationRecords.id, set: { idempotencyKey } });
}

async function recalculateIncident(db: any, incidentId: number) {
  const records = await db.select().from(notificationRecords).where(eq(notificationRecords.incidentId, incidentId));
  if (!records.length) {
    await db.update(sosAlerts).set({ notificationStatus: "failed" }).where(eq(sosAlerts.id, incidentId));
    return;
  }
  const status = records.every((record: any) => record.status === "delivered")
    ? "delivered"
    : records.some((record: any) => record.status === "sent" || record.status === "delivered")
      ? "sent"
      : records.some((record: any) => record.status === "pending")
        ? "pending"
        : "failed";
  await db.update(sosAlerts).set({ notificationStatus: status }).where(eq(sosAlerts.id, incidentId));
}

async function claimSosRecord(db: any, record: typeof notificationRecords.$inferSelect) {
  if (record.attemptCount >= record.maxAttempts) {
    await db.update(notificationRecords).set({
      status: "failed",
      errorMessage: `Exceeded maximum delivery attempts (${record.maxAttempts}).`,
      processingAt: null,
    }).where(eq(notificationRecords.id, record.id));
    return false;
  }
  const now = new Date();
  const result = await db.update(notificationRecords).set({
    attemptCount: record.attemptCount + 1,
    lastAttemptAt: now,
    processingAt: now,
    nextAttemptAt: new Date(now.getTime() + LOCK_MS),
  }).where(and(eq(notificationRecords.id, record.id), eq(notificationRecords.status, "pending"), lte(notificationRecords.nextAttemptAt, now)));
  return resultAffectedRows(result) > 0;
}

async function processSosRecord(db: any, record: typeof notificationRecords.$inferSelect) {
  if (!await claimSosRecord(db, record)) return false;
  const [alert, contact, owner] = await Promise.all([
    db.select().from(sosAlerts).where(eq(sosAlerts.id, record.incidentId)).limit(1),
    db.select().from(emergencyContacts).where(eq(emergencyContacts.id, record.contactId)).limit(1),
    db.select({ name: users.name }).from(sosAlerts).leftJoin(users, eq(users.id, sosAlerts.userId)).where(eq(sosAlerts.id, record.incidentId)).limit(1),
  ]);
  const incident = alert[0];
  const recipient = contact[0];
  if (!incident || !recipient || !["active", "acknowledged"].includes(incident.status)) {
    await db.update(notificationRecords).set({ status: "failed", errorMessage: "Notification suppressed because the incident is no longer active.", processingAt: null }).where(eq(notificationRecords.id, record.id));
    if (incident) await addTimeline(db, incident.id, "notification_suppressed", `${record.channel.toUpperCase()} notification was not sent because the incident is no longer active (${incident.status})`);
    return true;
  }

  const rawToken = createSecureToken();
  await db.insert(emergencyAccessTokens).values({
    incidentId: incident.id,
    tokenHash: hashSecureToken(rawToken),
    expiresAt: incident.emergencyTokenExpiresAt || new Date(Date.now() + SESSION_LINK_TTL_MS),
  });
  const result = await sendNotification(record.channel, recipient, owner[0]?.name || "a SurakshaShe user", incident, rawToken, record.idempotencyKey);
  const now = new Date();
  if (result.status === "sent" || result.status === "delivered") {
    await db.update(notificationRecords).set({
      status: result.status,
      providerMessageId: result.providerMessageId || null,
      errorMessage: null,
      sentAt: now,
      deliveredAt: result.status === "delivered" ? now : null,
      processingAt: null,
    }).where(eq(notificationRecords.id, record.id));
    await addTimeline(db, incident.id, `notification_${result.status}`, `${record.channel.toUpperCase()} ${result.status} for ${recipient.name}${record.recipientVerified ? " (verified channel)" : " (unverified channel)"}`);
  } else if (result.retryable && record.attemptCount + 1 < record.maxAttempts) {
    const nextAttemptAt = retryAt(record.attemptCount + 1);
    await db.update(notificationRecords).set({
      status: "pending",
      errorMessage: result.errorMessage || "Provider request failed; retry scheduled.",
      processingAt: null,
      nextAttemptAt,
    }).where(eq(notificationRecords.id, record.id));
    await addTimeline(db, incident.id, "notification_retry_scheduled", `${record.channel.toUpperCase()} delivery to ${recipient.name} failed; retry ${record.attemptCount + 2} of ${record.maxAttempts} is scheduled`);
  } else {
    await db.update(notificationRecords).set({ status: "failed", errorMessage: result.errorMessage || "Notification provider failed.", processingAt: null }).where(eq(notificationRecords.id, record.id));
    await addTimeline(db, incident.id, "notification_failed", `${record.channel.toUpperCase()} notification failed for ${recipient.name}: ${result.errorMessage || "provider failure"}`);
  }
  await recalculateIncident(db, incident.id);
  return true;
}

export async function processSosNotificationQueue(limit = 25) {
  const db = await getDb();
  if (!db) return { processed: 0 };
  const now = new Date();
  const records = await db.select().from(notificationRecords).where(and(eq(notificationRecords.status, "pending"), lte(notificationRecords.nextAttemptAt, now))).limit(limit);
  let processed = 0;
  for (const record of records) if (await processSosRecord(db, record)) processed += 1;
  return { processed };
}

async function claimCheckInRecord(db: any, record: typeof checkInEscalations.$inferSelect) {
  if (record.attemptCount >= record.maxAttempts) {
    await db.update(checkInEscalations).set({
      status: "failed",
      errorMessage: `Exceeded maximum delivery attempts (${record.maxAttempts}).`,
      processingAt: null,
    }).where(eq(checkInEscalations.id, record.id));
    return false;
  }
  const now = new Date();
  const result = await db.update(checkInEscalations).set({
    attemptCount: record.attemptCount + 1,
    lastAttemptAt: now,
    processingAt: now,
    nextAttemptAt: new Date(now.getTime() + LOCK_MS),
  }).where(and(eq(checkInEscalations.id, record.id), eq(checkInEscalations.status, "pending"), lte(checkInEscalations.nextAttemptAt, now)));
  return resultAffectedRows(result) > 0;
}

async function processCheckInRecord(db: any, record: typeof checkInEscalations.$inferSelect) {
  if (!await claimCheckInRecord(db, record)) return false;
  const [checkIn, contact, owner] = await Promise.all([
    db.select().from(safetyCheckIns).where(eq(safetyCheckIns.id, record.checkInId)).limit(1),
    db.select().from(emergencyContacts).where(eq(emergencyContacts.id, record.contactId)).limit(1),
    db.select({ name: users.name }).from(safetyCheckIns).leftJoin(users, eq(users.id, safetyCheckIns.userId)).where(eq(safetyCheckIns.id, record.checkInId)).limit(1),
  ]);
  const safetyCheckIn = checkIn[0];
  const recipient = contact[0];
  if (!safetyCheckIn || safetyCheckIn.status !== "expired" || !recipient) {
    await db.update(checkInEscalations).set({ status: "failed", errorMessage: "Notification suppressed because this check-in is no longer overdue.", processingAt: null }).where(eq(checkInEscalations.id, record.id));
    return true;
  }
  const result = await sendContactMessage(record.channel, recipient, "SurakshaShe safety check-in expired", `The safety check-in from ${owner[0]?.name || "your trusted contact"} was not marked safe by the expected arrival time. Please check in with them or contact emergency services if needed.`, record.idempotencyKey);
  if (result.status === "sent" || result.status === "delivered") {
    await db.update(checkInEscalations).set({ status: "sent", providerMessageId: result.providerMessageId || null, errorMessage: null, processingAt: null }).where(eq(checkInEscalations.id, record.id));
  } else if (result.retryable && record.attemptCount + 1 < record.maxAttempts) {
    await db.update(checkInEscalations).set({ status: "pending", errorMessage: result.errorMessage || "Provider request failed; retry scheduled.", processingAt: null, nextAttemptAt: retryAt(record.attemptCount + 1) }).where(eq(checkInEscalations.id, record.id));
  } else {
    await db.update(checkInEscalations).set({ status: "failed", errorMessage: result.errorMessage || "Notification provider failed.", processingAt: null }).where(eq(checkInEscalations.id, record.id));
  }
  return true;
}

export async function processCheckInNotificationQueue(limit = 25) {
  const db = await getDb();
  if (!db) return { processed: 0 };
  const records = await db.select().from(checkInEscalations).where(and(eq(checkInEscalations.status, "pending"), lte(checkInEscalations.nextAttemptAt, new Date()))).limit(limit);
  let processed = 0;
  for (const record of records) if (await processCheckInRecord(db, record)) processed += 1;
  return { processed };
}

export async function processSosEscalations() {
  const db = await getDb();
  if (!db) return { escalated: 0 };
  const now = new Date();
  const alerts = await db.select().from(sosAlerts).where(and(eq(sosAlerts.status, "active"), lte(sosAlerts.nextEscalationAt, now))).limit(25);
  let escalated = 0;
  for (const alert of alerts) {
    const nextContacts = await db.select().from(emergencyContacts).where(and(eq(emergencyContacts.userId, alert.userId), gt(emergencyContacts.priority, alert.escalationLevel))).orderBy(emergencyContacts.priority).limit(1);
    const nextPriority = nextContacts[0]?.priority;
    if (!nextPriority) {
      const ended = await db.update(sosAlerts).set({ nextEscalationAt: null }).where(and(eq(sosAlerts.id, alert.id), eq(sosAlerts.status, "active"), eq(sosAlerts.escalationLevel, alert.escalationLevel)));
      if (resultAffectedRows(ended)) await addTimeline(db, alert.id, "escalation_complete", "No further contact priority is configured for this SOS");
      continue;
    }
    const policy = (await db.select().from(sosEscalationPolicies).where(eq(sosEscalationPolicies.userId, alert.userId)).limit(1))[0];
    const waitMinutes = policy?.acknowledgementWaitMinutes ?? DEFAULT_WAIT_MINUTES;
    const advanced = await db.update(sosAlerts).set({
      escalationLevel: nextPriority,
      nextEscalationAt: new Date(now.getTime() + waitMinutes * 60_000),
    }).where(and(eq(sosAlerts.id, alert.id), eq(sosAlerts.status, "active"), eq(sosAlerts.escalationLevel, alert.escalationLevel), lte(sosAlerts.nextEscalationAt, now)));
    if (!resultAffectedRows(advanced)) continue;
    const queued = await queueSosPriority(db, alert.id, alert.userId, nextPriority);
    await addTimeline(db, alert.id, "escalated", `No acknowledgement received; escalated to priority ${nextPriority} (${queued} notification channel${queued === 1 ? "" : "s"} queued)`);
    if (!queued) await addTimeline(db, alert.id, "notification_pending", `Priority ${nextPriority} has no configured notification channels.`);
    escalated += 1;
  }
  return { escalated };
}

export async function processDeliveryQueues() {
  if (workerRunning) return { skipped: true };
  workerRunning = true;
  try {
    const [escalations, sos, checkIns] = await Promise.all([processSosEscalations(), processSosNotificationQueue(), processCheckInNotificationQueue()]);
    return { escalations: escalations.escalated, sos: sos.processed, checkIns: checkIns.processed };
  } finally {
    workerRunning = false;
  }
}

export function startDeliveryWorker() {
  if (workerTimer) return;
  const configured = Number(process.env.NOTIFICATION_WORKER_INTERVAL_MS || 15_000);
  const intervalMs = Number.isFinite(configured) ? Math.max(5_000, configured) : 15_000;
  workerTimer = setInterval(() => { void processDeliveryQueues().catch(error => console.error("[Delivery worker]", error)); }, intervalMs);
  workerTimer.unref();
  void processDeliveryQueues().catch(error => console.error("[Delivery worker]", error));
}

export async function triggerDeliveryWorkerImmediate() {
  try {
    return await processDeliveryQueues();
  } catch (error) {
    console.error("[Delivery worker trigger]", error);
  }
}
