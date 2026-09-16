import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
import { ENV } from "./_core/env";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
const STORAGE_BUCKET = ENV.supabaseStorageBucket || "suraksha-media";

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error("[Storage] Failed to create upload directory", err);
  }
}
ensureUploadDir();

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function saveUploadedFile(fileData: Buffer, originalName: string, mimeType: string): Promise<{ fileKey: string, sizeBytes: number }> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid file type: ${mimeType}. Only JPG, PNG, and WEBP are allowed.` });
  }

  if (fileData.length > MAX_FILE_SIZE) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File exceeds the 5MB size limit." });
  }

  const fileKey = crypto.randomBytes(32).toString("hex") + path.extname(originalName).toLowerCase();

  // 1. Upload to Supabase Storage if configured
  if (isSupabaseConfigured()) {
    try {
      const admin = getSupabaseAdmin();
      const { error } = await admin.storage.from(STORAGE_BUCKET).upload(fileKey, fileData, {
        contentType: mimeType,
        upsert: true,
      });
      if (error) {
        console.warn("[Storage] Supabase Storage upload error (falling back to local):", error.message);
      }
    } catch (sbErr) {
      console.warn("[Storage] Supabase Storage error:", sbErr);
    }
  }

  // 2. Always persist to local disk as safe fallback / fast cache
  const filePath = path.join(UPLOAD_DIR, fileKey);
  await fs.writeFile(filePath, fileData);

  return { fileKey, sizeBytes: fileData.length };
}

export async function getUploadedFile(fileKey: string): Promise<{ fileData: Buffer, mimeType: string } | null> {
  const safeFileKey = path.basename(fileKey);

  // 1. Try Supabase Storage first if configured
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

  // 2. Fall back to local disk
  const filePath = path.join(UPLOAD_DIR, safeFileKey);
  try {
    const fileData = await fs.readFile(filePath);
    let mimeType = "application/octet-stream";
    if (safeFileKey.endsWith(".jpg") || safeFileKey.endsWith(".jpeg")) mimeType = "image/jpeg";
    if (safeFileKey.endsWith(".png")) mimeType = "image/png";
    if (safeFileKey.endsWith(".webp")) mimeType = "image/webp";

    return { fileData, mimeType };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function storagePut(key: string, body: Buffer, contentType: string): Promise<{ url: string }> {
  const safeFileKey = path.basename(key);
  const fileKey = crypto.randomBytes(16).toString("hex") + safeFileKey;

  if (isSupabaseConfigured()) {
    try {
      const admin = getSupabaseAdmin();
      await admin.storage.from(STORAGE_BUCKET).upload(fileKey, body, {
        contentType,
        upsert: true,
      });
    } catch (err) {
      console.warn("[Storage] storagePut Supabase error:", err);
    }
  }

  const filePath = path.join(UPLOAD_DIR, fileKey);
  await fs.writeFile(filePath, body);
  return { url: `/api/files/${fileKey}` };
}

export async function getSignedStorageUrl(fileKey: string, expiresIn = 3600): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const admin = getSupabaseAdmin();
    const safeFileKey = path.basename(fileKey);
    const { data, error } = await admin.storage.from(STORAGE_BUCKET).createSignedUrl(safeFileKey, expiresIn);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
