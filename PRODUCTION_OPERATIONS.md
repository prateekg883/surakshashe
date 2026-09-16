# SurakshaShe Production Operations & Disaster Recovery Guide

---

## 1. Managed Database Architecture & Operations

SurakshaShe uses a relational PostgreSQL database with Drizzle ORM. In production, this must run on a managed cloud database service (e.g. Supabase, AWS RDS PostgreSQL, Google Cloud SQL for PostgreSQL, Azure Database for PostgreSQL, or Aiven PostgreSQL) and never on a developer's workstation.

### Connection Architecture
- **Environment Driven:** The database endpoint is supplied strictly through the `DATABASE_URL` secret.
- **Connection Pooling:** The server initializes a connection pool via `postgres.js` (`waitForConnections: true, connectionLimit: 10, idleTimeout: 60000, enableKeepAlive: true`).
- **Encrypted Transport:** Remote connections require TLS/SSL encryption (`DATABASE_SSL=true` or query parameter `?ssl={"rejectUnauthorized":true}`).
- **Health Monitoring:** Automated health checks at `/api/health` and `/healthz` execute a fast ping (`SELECT 1`) and count schema tables to report live availability.

---

## 2. Production Backup & Disaster Recovery Strategy

### Automated Backups
1. **Daily Automated Snapshots:** Configure the cloud database provider for automated daily full backups with a minimum 7-day retention period (30 days recommended).
2. **Point-in-Time Recovery (PITR):** Enable binary logging (binlogs) on the managed PostgreSQL instance to enable point-in-time restoration to any second within the retention window.
3. **Pre-Migration Backups:** Before executing any Drizzle schema changes or migrations in production, trigger a manual on-demand snapshot in the cloud database console.

### Database Outage Handling
- If the database becomes temporarily unavailable, the application gracefully returns a sanitized `503 Service Unavailable` response to users:
  `"Safety services are temporarily unavailable. Please try again."`
- Internal SQL errors, stack traces, and database connection strings are never exposed to clients.
- The server automatically attempts reconnection on incoming requests when the database recovers.

### Database Restore Procedure
1. Provision a new or restored database instance from the target snapshot or point-in-time in your cloud provider console.
2. Update the `DATABASE_URL` secret in your hosting platform with the new connection string.
3. Verify connectivity via `/api/health` to confirm `status: "ok"` and that all 17 schema tables exist.
4. Execute application smoke tests:
   - User login and registration
   - Contact retrieval and creation
   - Test SOS activation and emergency link view
   - Check-in creation and resolution
   - Admin audit log access

---

## 3. Real Notification Infrastructure & Webhooks

SurakshaShe never uses mock or simulated notifications for emergency alerts. Notifications are delivered through real verified providers:

- **Email Delivery:** Resend HTTP API (`https://api.resend.com/emails`).
- **SMS Delivery:** Twilio Messages API.
- **WhatsApp Delivery:** Twilio WhatsApp API (`whatsapp:` sender).

### Notification Status Policy
- **`pending`:** Notification is queued in the database.
- **`sent`:** Provider has accepted the message and returned a message ID. *(Note: `sent` confirms provider dispatch, not that the human recipient has opened the message.)*
- **`delivered`:** Provider callback confirms handset receipt.
- **`failed`:** Missing credentials, provider rejection, or unverified sender identity.

### Webhook Verification
- **Twilio Status Callback (`/api/webhooks/twilio/status`):** Verified using HMAC-SHA1 signature (`X-Twilio-Signature`) and constant-time string comparison.
- **Resend Callback (`/api/webhooks/resend`):** Verified using Svix cryptographic headers (`svix-id`, `svix-timestamp`, `svix-signature`).

---

## 4. SOS Reliability & Escalation Architecture

1. **Durable Persistence First:** The browser captures location coordinates and writes the SOS incident to the database *before* notification queuing begins. A notification failure will never delete or invalidate the emergency incident.
2. **Idempotency:** Every notification record has a unique `idempotencyKey` (`sos/<incidentId>/contact/<contactId>/<channel>`) to prevent duplicate messages.
3. **Escalation Hierarchy:** Priority-1 contacts are alerted immediately. If no contact acknowledges within the user's configured wait window (default 5 minutes), the background worker automatically escalates to Priority-2 contacts.
4. **Immediate Revocation:** When the user marks themselves safe (`sos.markSafe`), the incident status transitions to `resolved`, emergency tokens are revoked immediately, and further notifications are suppressed.

---

## 5. Security & Isolation Controls

- **Tenant Isolation (IDOR/BOLA Protection):** Every procedure explicitly enforces `where(eq(table.userId, ctx.user.id))`. Users cannot read, modify, or delete another user's alerts, contacts, check-ins, or data.
- **Secure Sessions:** Sessions are signed with HMAC-SHA256 and store a monotonic `sessionVersion`. A password reset or security action increments `sessionVersion`, invalidating all existing sessions.
- **Token Security:** Emergency access tokens and password reset tokens are stored exclusively as one-way SHA-256 hashes. Plaintext tokens exist only in the notification message or link payload.
- **Account Erasure:** Full account deletion requires typing `DELETE MY ACCOUNT` and cascades cleanly across all 17 tables in a single database transaction.
