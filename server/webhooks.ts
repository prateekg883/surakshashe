import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { Webhook } from "svix";
import { getDb } from "./db";
import { incidentTimeline, notificationRecords, providerWebhookEvents, sosAlerts } from "../drizzle/schema";

const router = Router();

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function computeTwilioSignature(authToken: string, url: string, params: Record<string, any>): string {
  const data = Object.keys(params || {})
    .sort()
    .reduce((value, key) => value + key + params[key], url);
  return createHmac("sha1", authToken).update(data).digest("base64");
}

export function twilioSignature(req: any): boolean {
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

export function mapTwilioStatus(status: string): "sent" | "delivered" | "failed" | null {
  if (["queued", "accepted", "sending", "sent"].includes(status)) return "sent";
  if (["delivered", "read"].includes(status)) return "delivered";
  if (["failed", "undelivered"].includes(status)) return "failed";
  return null;
}

async function recalculateIncident(db: any, incidentId: number) {
  const records = await db.select().from(notificationRecords).where(eq(notificationRecords.incidentId, incidentId));
  if (!records.length) return;
  const status = records.every((record: any) => record.status === "delivered") ? "delivered" : records.some((record: any) => record.status === "sent" || record.status === "delivered") ? "sent" : records.every((record: any) => record.status === "failed") ? "failed" : "pending";
  await db.update(sosAlerts).set({ notificationStatus: status }).where(eq(sosAlerts.id, incidentId));
}

async function applyProviderStatus(provider: string, providerMessageId: string, status: "sent" | "delivered" | "failed", rawEventType?: string, errorMessage?: string) {
  const db = await getDb();
  if (!db) return;
  const record = (await db.select().from(notificationRecords).where(eq(notificationRecords.providerMessageId, providerMessageId)).limit(1))[0];
  const priorEvent = (await db.select().from(providerWebhookEvents).where(eq(providerWebhookEvents.providerMessageId, providerMessageId)).limit(1))[0];
  await db.insert(providerWebhookEvents).values({ provider, providerMessageId, status, rawEventType: rawEventType || null }).onConflictDoUpdate({ target: providerWebhookEvents.providerMessageId, set: { status, rawEventType: rawEventType || null } });
  if (!record) return;
  if (priorEvent && record.status === status) return;
  const now = new Date();
  await db.update(notificationRecords).set({ status, errorMessage: errorMessage || null, deliveredAt: status === "delivered" ? now : record.deliveredAt, sentAt: status === "sent" || status === "delivered" ? record.sentAt || now : record.sentAt }).where(eq(notificationRecords.id, record.id));
  await recalculateIncident(db, record.incidentId);
  await db.insert(incidentTimeline).values({ incidentId: record.incidentId, eventType: `notification_${status}`, message: `${record.channel.toUpperCase()} provider update: ${status}` });
}

router.post("/twilio/status", async (req, res) => {
  if (!twilioSignature(req)) return res.status(401).json({ error: "Invalid provider signature." });
  const messageId = String(req.body?.MessageSid || req.body?.SmsSid || "");
  const status = mapTwilioStatus(String(req.body?.MessageStatus || req.body?.SmsStatus || ""));
  if (!messageId || !status) return res.status(204).end();
  await applyProviderStatus("twilio", messageId, status, String(req.body?.MessageStatus || ""), req.body?.ErrorCode ? "Provider reported delivery failure." : undefined);
  return res.status(204).end();
});

router.post("/resend", async (req, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const rawBody = (req as any).rawBody;
  if (!secret || !rawBody) {
    console.warn("[Resend Webhook] Webhook received but RESEND_WEBHOOK_SECRET or rawBody is not available.");
    return res.status(503).json({ error: "Resend webhook verification is not configured." });
  }

  try {
    const wh = new Webhook(secret);
    wh.verify(rawBody, {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    } as any);
  } catch (error: any) {
    console.error("[Resend Webhook] Signature verification failed:", error?.message || error);
    return res.status(401).json({ error: "Invalid provider signature." });
  }

  const event = req.body as {
    type?: string;
    data?: { email_id?: string; id?: string; message_id?: string; [key: string]: any };
  };

  const providerMessageId = event.data?.email_id || event.data?.id || event.data?.message_id;
  if (!providerMessageId) {
    console.warn(`[Resend Webhook] Event '${event?.type}' received without provider message identifier.`);
    return res.status(204).end();
  }

  const eventType = event.type || "unknown";
  const status =
    eventType === "email.delivered"
      ? "delivered"
      : ["email.bounced", "email.failed", "email.complained", "email.delivery_delayed"].includes(eventType)
        ? "failed"
        : "sent";

  console.log(`[Resend Webhook] Received '${eventType}' for message ID '${providerMessageId}' -> mapped status: '${status}'`);
  await applyProviderStatus("resend", providerMessageId, status, eventType);
  return res.status(204).end();
});

export function registerWebhookRoutes(app: any) {
  app.use("/api/webhooks", router);
}
