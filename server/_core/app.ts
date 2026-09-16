import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerWebhookRoutes } from "../webhooks";
import { opportunisticSafetySweep, processCheckInSchedule } from "../scheduled";
import { checkDatabaseHealth } from "../db";
import { getUploadedFile } from "../storage";
import { processDeliveryQueues } from "../deliveryQueueService";

export function createExpressApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
    res.setHeader("X-Frame-Options", "DENY");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  // Request-driven opportunistic safety sweep (runs at most once every 30s)
  app.use("/api", async (_req, _res, next) => {
    try {
      await opportunisticSafetySweep();
    } catch {
      // never block request pipeline on sweep error
    }
    next();
  });

  // Configure body parser with 50mb limit for uploads
  app.use(express.json({
    limit: "50mb",
    verify: (req: any, _res, buffer) => {
      req.rawBody = Buffer.from(buffer);
    },
  }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Public health check endpoints (also triggers sweep on external uptime monitor pings)
  app.get(["/api/health", "/healthz"], async (_req, res) => {
    const health = await checkDatabaseHealth();
    if (health.ok) {
      return res.status(200).json({
        status: "ok",
        database: "connected",
        tables: health.tableCount ?? 0,
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(503).json({
      status: "degraded",
      database: "unavailable",
      message: "Safety services are temporarily unavailable. Please try again.",
      timestamp: new Date().toISOString(),
    });
  });

  // File serving route
  app.get("/api/files/:fileKey", async (req, res) => {
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

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerWebhookRoutes(app);

  // Public root API endpoint
  app.get(["/api", "/api/"], (_req, res) => {
    res.status(200).json({ status: "ok", service: "SurakshaShe API" });
  });

  // Scheduled / Cron tasks endpoints for serverless environments (e.g. Vercel Cron)
  app.all(["/api/scheduled/process-check-ins", "/api/cron/process-check-ins"], processCheckInSchedule);
  app.all(["/api/scheduled/process-queues", "/api/cron/process-queues"], async (_req, res) => {
    try {
      const result = await processDeliveryQueues();
      res.status(200).json({ status: "ok", ...result, timestamp: new Date().toISOString() });
    } catch (err: any) {
      console.error("[Cron Delivery Queue Error]:", err);
      res.status(500).json({ status: "error", message: err?.message || "Failed to process queue" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
