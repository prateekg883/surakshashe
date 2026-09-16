export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || "suraksha-media",
};

export function assertProductionEnvironment() {
  if (!ENV.isProduction) return;
  const missing = [
    !ENV.databaseUrl && "DATABASE_URL",
    !ENV.cookieSecret && "JWT_SECRET",
    !(process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL) && "APP_BASE_URL",
  ].filter(Boolean);
  if (missing.length) throw new Error(`Production configuration is incomplete: ${missing.join(", ")} must be set.`);
  if (ENV.cookieSecret.length < 32) throw new Error("JWT_SECRET must contain at least 32 random characters in production.");
  const publicUrl = process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL || "";
  if (!publicUrl.startsWith("https://")) throw new Error("APP_BASE_URL must use HTTPS in production.");
}
