import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerWebhookRoutes } from "../webhooks";
import { processCheckInSchedule } from "../scheduled";
import { startDeliveryWorker } from "../deliveryQueueService";
import { assertProductionEnvironment } from "./env";
import { checkDatabaseHealth } from "../db";
import { getUploadedFile } from "../storage";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  assertProductionEnvironment();
  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.ok) {
    console.log(`[Database Health] ${dbHealth.message}`);
  } else {
    console.warn(`[Database Health] Warning: ${dbHealth.message}`);
  }

  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
    res.setHeader("X-Frame-Options", "DENY");
    if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb", verify: (req: any, _res, buffer) => { req.rawBody = Buffer.from(buffer); } }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Public health check endpoints
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
  app.post("/api/scheduled/process-check-ins", processCheckInSchedule);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startDeliveryWorker();
  });
}

startServer().catch(console.error);
