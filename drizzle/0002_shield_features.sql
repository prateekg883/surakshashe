-- Add isNextOfKin to emergencyContacts
ALTER TABLE "emergencyContacts" ADD COLUMN IF NOT EXISTS "isNextOfKin" boolean DEFAULT false NOT NULL;

-- Trip status enum
DO $$ BEGIN
  CREATE TYPE "public"."tripStatus" AS ENUM('active', 'completed', 'cancelled', 'emergency');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Travel Trips table
CREATE TABLE IF NOT EXISTS "travelTrips" (
  "id" serial PRIMARY KEY NOT NULL,
  "tripId" varchar(64) NOT NULL UNIQUE,
  "userId" integer NOT NULL,
  "destination" text NOT NULL,
  "expectedArrival" timestamp NOT NULL,
  "vehicleNumber" varchar(60),
  "vehicleType" varchar(60),
  "vehicleColor" varchar(60),
  "vehicleDescription" text,
  "vehiclePhotoKey" varchar(255),
  "trustedContactIds" text,
  "verificationCode" varchar(32) NOT NULL,
  "status" "tripStatus" DEFAULT 'active' NOT NULL,
  "startedAt" timestamp DEFAULT now() NOT NULL,
  "completedAt" timestamp,
  "lastLatitude" double precision,
  "lastLongitude" double precision,
  "lastAccuracy" double precision,
  "lastLocationAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Travel Locations table
CREATE TABLE IF NOT EXISTS "travelLocations" (
  "id" serial PRIMARY KEY NOT NULL,
  "tripId" integer NOT NULL,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "accuracy" double precision,
  "timestamp" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

-- Nearby Responder Settings table
CREATE TABLE IF NOT EXISTS "nearbyResponderSettings" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL UNIQUE,
  "enabled" boolean DEFAULT false NOT NULL,
  "lastLatitude" double precision,
  "lastLongitude" double precision,
  "lastLocationAt" timestamp,
  "radiusKm" double precision DEFAULT 5.0 NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Nearby Alert Notifications table
CREATE TABLE IF NOT EXISTS "nearbyAlertNotifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "incidentId" integer NOT NULL,
  "responderUserId" integer NOT NULL,
  "distanceKm" double precision NOT NULL,
  "status" varchar(40) DEFAULT 'notified' NOT NULL,
  "notifiedAt" timestamp DEFAULT now() NOT NULL,
  "acknowledgedAt" timestamp
);

-- Emergency Responder Destinations table
CREATE TABLE IF NOT EXISTS "emergencyResponderDestinations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "type" varchar(40) NOT NULL,
  "phone" varchar(64),
  "email" varchar(320),
  "notifySms" boolean DEFAULT false NOT NULL,
  "notifyEmail" boolean DEFAULT false NOT NULL,
  "notifyWhatsApp" boolean DEFAULT false NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "priority" integer DEFAULT 1 NOT NULL,
  "notes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Community Posts table
CREATE TABLE IF NOT EXISTS "communityPosts" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "content" text NOT NULL,
  "category" varchar(60) DEFAULT 'safety_tip' NOT NULL,
  "locationName" varchar(120),
  "isHidden" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Community Comments table
CREATE TABLE IF NOT EXISTS "communityComments" (
  "id" serial PRIMARY KEY NOT NULL,
  "postId" integer NOT NULL,
  "userId" integer NOT NULL,
  "content" text NOT NULL,
  "isHidden" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

-- Community Reports table
CREATE TABLE IF NOT EXISTS "communityReports" (
  "id" serial PRIMARY KEY NOT NULL,
  "reportedByUserId" integer NOT NULL,
  "postId" integer,
  "commentId" integer,
  "reason" varchar(255) NOT NULL,
  "status" varchar(40) DEFAULT 'pending' NOT NULL,
  "adminNotes" text,
  "reviewedByUserId" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "reviewedAt" timestamp
);
