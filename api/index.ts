import type { Request, Response } from "express";
import { createExpressApp } from "../server/_core/app";

const app = createExpressApp();

export default function handler(req: Request, res: Response) {
  // Ensure req.url starts with /api if it was stripped or rewritten by Vercel
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  return app(req, res);
}
