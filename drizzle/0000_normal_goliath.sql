CREATE TYPE "public"."channel" AS ENUM('sms', 'email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."checkInEscalationStatus" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."checkInStatus" AS ENUM('active', 'safe', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notificationStatus" AS ENUM('pending', 'sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."response" AS ENUM('acknowledged', 'responding');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'acknowledged', 'resolved', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."kind" AS ENUM('email', 'phone');--> statement-breakpoint
CREATE TABLE "accountDeletionRequests" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "auditLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actorUserId" integer,
	"action" varchar(120) NOT NULL,
	"targetType" varchar(80),
	"targetId" integer,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkInEscalations" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkInId" integer NOT NULL,
	"contactId" integer NOT NULL,
	"channel" "channel" NOT NULL,
	"status" "checkInEscalationStatus" DEFAULT 'pending' NOT NULL,
	"providerMessageId" varchar(255),
	"errorMessage" text,
	"idempotencyKey" varchar(191) NOT NULL,
	"attemptCount" integer DEFAULT 0 NOT NULL,
	"maxAttempts" integer DEFAULT 5 NOT NULL,
	"nextAttemptAt" timestamp DEFAULT now() NOT NULL,
	"lastAttemptAt" timestamp,
	"processingAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checkInEscalations_idempotencyKey_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "checkInPolicies" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"escalationEnabled" boolean DEFAULT false NOT NULL,
	"graceMinutes" integer DEFAULT 15 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checkInPolicies_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "emergencyAccessTokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"incidentId" integer NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"revokedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "emergencyAccessTokens_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "emergencyContacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"phone" varchar(64) NOT NULL,
	"email" varchar(320),
	"relationship" varchar(120),
	"priority" integer DEFAULT 1 NOT NULL,
	"notifySms" boolean DEFAULT true NOT NULL,
	"notifyEmail" boolean DEFAULT true NOT NULL,
	"notifyWhatsApp" boolean DEFAULT false NOT NULL,
	"phoneVerifiedAt" timestamp,
	"emailVerifiedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidentAcknowledgements" (
	"id" serial PRIMARY KEY NOT NULL,
	"incidentId" integer NOT NULL,
	"contactId" integer NOT NULL,
	"response" "response" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidentTimeline" (
	"id" serial PRIMARY KEY NOT NULL,
	"incidentId" integer NOT NULL,
	"eventType" varchar(80) NOT NULL,
	"message" varchar(500) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificationRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"incidentId" integer NOT NULL,
	"contactId" integer NOT NULL,
	"channel" "channel" NOT NULL,
	"status" "notificationStatus" DEFAULT 'pending' NOT NULL,
	"providerMessageId" varchar(255),
	"errorMessage" text,
	"sentAt" timestamp,
	"deliveredAt" timestamp,
	"idempotencyKey" varchar(191) NOT NULL,
	"recipientVerified" boolean DEFAULT false NOT NULL,
	"attemptCount" integer DEFAULT 0 NOT NULL,
	"maxAttempts" integer DEFAULT 5 NOT NULL,
	"nextAttemptAt" timestamp DEFAULT now() NOT NULL,
	"lastAttemptAt" timestamp,
	"processingAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notificationRecords_idempotencyKey_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "passwordResetTokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "passwordResetTokens_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "providerWebhookEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(40) NOT NULL,
	"providerMessageId" varchar(255) NOT NULL,
	"status" varchar(40) NOT NULL,
	"rawEventType" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "providerWebhookEvents_providerMessageId_unique" UNIQUE("providerMessageId")
);
--> statement-breakpoint
CREATE TABLE "safetyCheckIns" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"message" varchar(240) NOT NULL,
	"expectedArrival" timestamp NOT NULL,
	"reminderAt" timestamp,
	"status" "checkInStatus" DEFAULT 'active' NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sosAlerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"accuracy" double precision,
	"address" text,
	"status" "status" DEFAULT 'active' NOT NULL,
	"initialLatitude" double precision,
	"initialLongitude" double precision,
	"initialAccuracy" double precision,
	"lastLocationAt" timestamp,
	"emergencyTokenHash" varchar(128),
	"emergencyTokenExpiresAt" timestamp,
	"emergencyTokenRevokedAt" timestamp,
	"notificationStatus" "notificationStatus" DEFAULT 'pending' NOT NULL,
	"activatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp,
	"resolutionNote" text,
	"safeMarkedAt" timestamp,
	"escalationLevel" integer DEFAULT 1 NOT NULL,
	"nextEscalationAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "sosEscalationPolicies" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"acknowledgementWaitMinutes" integer DEFAULT 5 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sosEscalationPolicies_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "userSessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"sessionIdHash" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"revokedAt" timestamp,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "userSessions_sessionIdHash_unique" UNIQUE("sessionIdHash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"phone" varchar(64),
	"passwordHash" varchar(255),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"emailVerifiedAt" timestamp,
	"phoneVerifiedAt" timestamp,
	"sessionVersion" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "verificationTokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"contactId" integer,
	"kind" "kind" NOT NULL,
	"destination" varchar(320) NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verificationTokens_tokenHash_unique" UNIQUE("tokenHash")
);
