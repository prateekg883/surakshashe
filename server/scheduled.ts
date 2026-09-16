import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { sdk } from "./_core/sdk";
import { processExpiredCheckIns } from "./checkInService";
import { processDeliveryQueues } from "./deliveryQueueService";

function verifyCronSecret(req: Request): boolean {
  const configured = process.env.CRON_SECRET;
  if (!configured || configured.length < 16) return false;
  const header = req.headers["x-cron-secret"] || (typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined);
  if (typeof header !== "string") return false;
  const a = Buffer.from(header);
  const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function processCheckInSchedule(req: Request, res: Response) {
  try {
    let authorized = verifyCronSecret(req);
    if (!authorized) {
      if (!process.env.CRON_SECRET) {
        // If CRON_SECRET is not yet set in environment, allow execution with a log warning
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
    const result = await processExpiredCheckIns();
    const delivery = await processDeliveryQueues();
    return res.json({ ok: true, ...result, delivery, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[Scheduled Check-In Error]:", error);
    return res.status(500).json({ error: "scheduled check-in processing failed", timestamp: new Date().toISOString() });
  }
}
