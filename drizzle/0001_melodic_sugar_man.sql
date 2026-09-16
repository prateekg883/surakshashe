CREATE TYPE "public"."fileContext" AS ENUM('profile', 'evidence', 'suspect', 'vehicle', 'other');--> statement-breakpoint
CREATE TABLE "fileUploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"uploadedByUserId" integer NOT NULL,
	"fileKey" varchar(255) NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"mimeType" varchar(120) NOT NULL,
	"sizeBytes" integer NOT NULL,
	"context" "fileContext" DEFAULT 'other' NOT NULL,
	"contextId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fileUploads_fileKey_unique" UNIQUE("fileKey")
);
--> statement-breakpoint
CREATE TABLE "personOfConcernReports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reportedByUserId" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"gender" varchar(40),
	"ageApprox" varchar(40),
	"notes" text,
	"lastKnownLocation" text,
	"observedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicleReports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reportedByUserId" integer NOT NULL,
	"registrationNumber" varchar(40),
	"normalizedRegistration" varchar(40),
	"type" varchar(80),
	"makeModel" varchar(120),
	"color" varchar(40),
	"description" text,
	"relatedIncidentId" integer,
	"relatedPersonId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
