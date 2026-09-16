import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["active", "acknowledged", "resolved", "cancelled", "failed"]);
export const notificationStatusEnum = pgEnum("notificationStatus", ["pending", "sent", "delivered", "failed"]);
export const channelEnum = pgEnum("channel", ["sms", "email", "whatsapp"]);
export const responseEnum = pgEnum("response", ["acknowledged", "responding"]);
export const checkInStatusEnum = pgEnum("checkInStatus", ["active", "safe", "expired", "cancelled"]);
export const tokenKindEnum = pgEnum("kind", ["email", "phone"]);
export const checkInEscalationStatusEnum = pgEnum("checkInEscalationStatus", ["pending", "sent", "failed"]);


export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  authId: varchar("authId", { length: 64 }).unique(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  phone: varchar("phone", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  // Incrementing this invalidates every password session after a reset or
  // administrative security action without relying on an in-memory store.
  sessionVersion: integer("sessionVersion").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const emergencyContacts = pgTable("emergencyContacts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }),
  relationship: varchar("relationship", { length: 120 }),
  priority: integer("priority").default(1).notNull(),
  notifySms: boolean("notifySms").default(true).notNull(),
  notifyEmail: boolean("notifyEmail").default(true).notNull(),
  notifyWhatsApp: boolean("notifyWhatsApp").default(false).notNull(),
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const sosAlerts = pgTable("sosAlerts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  accuracy: doublePrecision("accuracy"),
  address: text("address"),
  status: statusEnum("status").default("active").notNull(),
  initialLatitude: doublePrecision("initialLatitude"),
  initialLongitude: doublePrecision("initialLongitude"),
  initialAccuracy: doublePrecision("initialAccuracy"),
  lastLocationAt: timestamp("lastLocationAt"),
  emergencyTokenHash: varchar("emergencyTokenHash", { length: 128 }),
  emergencyTokenExpiresAt: timestamp("emergencyTokenExpiresAt"),
  emergencyTokenRevokedAt: timestamp("emergencyTokenRevokedAt"),
  notificationStatus: notificationStatusEnum("notificationStatus").default("pending").notNull(),
  activatedAt: timestamp("activatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolutionNote: text("resolutionNote"),
  safeMarkedAt: timestamp("safeMarkedAt"),
  escalationLevel: integer("escalationLevel").default(1).notNull(),
  nextEscalationAt: timestamp("nextEscalationAt"),
});

export const notificationRecords = pgTable("notificationRecords", {
  id: serial("id").primaryKey(),
  incidentId: integer("incidentId").notNull(),
  contactId: integer("contactId").notNull(),
  channel: channelEnum("channel").notNull(),
  status: notificationStatusEnum("status").default("pending").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  idempotencyKey: varchar("idempotencyKey", { length: 191 }).notNull().unique(),
  recipientVerified: boolean("recipientVerified").default(false).notNull(),
  attemptCount: integer("attemptCount").default(0).notNull(),
  maxAttempts: integer("maxAttempts").default(5).notNull(),
  nextAttemptAt: timestamp("nextAttemptAt").defaultNow().notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  processingAt: timestamp("processingAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const incidentTimeline = pgTable("incidentTimeline", {
  id: serial("id").primaryKey(),
  incidentId: integer("incidentId").notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const incidentAcknowledgements = pgTable("incidentAcknowledgements", {
  id: serial("id").primaryKey(),
  incidentId: integer("incidentId").notNull(),
  contactId: integer("contactId").notNull(),
  response: responseEnum("response").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const safetyCheckIns = pgTable("safetyCheckIns", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  message: varchar("message", { length: 240 }).notNull(),
  expectedArrival: timestamp("expectedArrival").notNull(),
  reminderAt: timestamp("reminderAt"),
  status: checkInStatusEnum("status").default("active").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actorUserId"),
  action: varchar("action", { length: 120 }).notNull(),
  targetType: varchar("targetType", { length: 80 }),
  targetId: integer("targetId"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type SosAlert = typeof sosAlerts.$inferSelect;
export type SafetyCheckIn = typeof safetyCheckIns.$inferSelect;

export const passwordResetTokens = pgTable("passwordResetTokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const verificationTokens = pgTable("verificationTokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  contactId: integer("contactId"),
  kind: tokenKindEnum("kind").notNull(),
  destination: varchar("destination", { length: 320 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const providerWebhookEvents = pgTable("providerWebhookEvents", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 40 }).notNull(),
  rawEventType: varchar("rawEventType", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const checkInPolicies = pgTable("checkInPolicies", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  escalationEnabled: boolean("escalationEnabled").default(false).notNull(),
  graceMinutes: integer("graceMinutes").default(15).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const sosEscalationPolicies = pgTable("sosEscalationPolicies", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  acknowledgementWaitMinutes: integer("acknowledgementWaitMinutes").default(5).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const emergencyAccessTokens = pgTable("emergencyAccessTokens", {
  id: serial("id").primaryKey(),
  incidentId: integer("incidentId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userSessions = pgTable("userSessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  sessionIdHash: varchar("sessionIdHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const accountDeletionRequests = pgTable("accountDeletionRequests", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export const checkInEscalations = pgTable("checkInEscalations", {
  id: serial("id").primaryKey(),
  checkInId: integer("checkInId").notNull(),
  contactId: integer("contactId").notNull(),
  channel: channelEnum("channel").notNull(),
  status: checkInEscalationStatusEnum("status").default("pending").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  errorMessage: text("errorMessage"),
  idempotencyKey: varchar("idempotencyKey", { length: 191 }).notNull().unique(),
  attemptCount: integer("attemptCount").default(0).notNull(),
  maxAttempts: integer("maxAttempts").default(5).notNull(),
  nextAttemptAt: timestamp("nextAttemptAt").defaultNow().notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  processingAt: timestamp("processingAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// NEW FEATURES FOR FINAL PRODUCTION PHASE

export const fileContextEnum = pgEnum("fileContext", ["profile", "evidence", "suspect", "vehicle", "other"]);

export const fileUploads = pgTable("fileUploads", {
  id: serial("id").primaryKey(),
  uploadedByUserId: integer("uploadedByUserId").notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull().unique(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: integer("sizeBytes").notNull(),
  context: fileContextEnum("context").default("other").notNull(),
  contextId: integer("contextId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const personOfConcernReports = pgTable("personOfConcernReports", {
  id: serial("id").primaryKey(),
  reportedByUserId: integer("reportedByUserId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  gender: varchar("gender", { length: 40 }),
  ageApprox: varchar("ageApprox", { length: 40 }),
  notes: text("notes"),
  lastKnownLocation: text("lastKnownLocation"),
  observedAt: timestamp("observedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const vehicleReports = pgTable("vehicleReports", {
  id: serial("id").primaryKey(),
  reportedByUserId: integer("reportedByUserId").notNull(),
  registrationNumber: varchar("registrationNumber", { length: 40 }),
  normalizedRegistration: varchar("normalizedRegistration", { length: 40 }),
  type: varchar("type", { length: 80 }),
  makeModel: varchar("makeModel", { length: 120 }),
  color: varchar("color", { length: 40 }),
  description: text("description"),
  relatedIncidentId: integer("relatedIncidentId"),
  relatedPersonId: integer("relatedPersonId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type FileUpload = typeof fileUploads.$inferSelect;
export type PersonOfConcernReport = typeof personOfConcernReports.$inferSelect;
export type VehicleReport = typeof vehicleReports.$inferSelect;
