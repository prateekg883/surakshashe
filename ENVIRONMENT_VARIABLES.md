# SurakshaShe Environment Configuration

Use environment variables to configure SurakshaShe. Secrets must never be committed to Git.

---

## 1. Development vs. Production Setup

### Development Configuration (`.env`)
```bash
NODE_ENV=development
DATABASE_URL=postgresql://postgres:localpassword@127.0.0.1:5432/postgres
JWT_SECRET=development-secret-key-at-least-32-chars-long-2026
APP_BASE_URL=http://localhost:3000
DB_POOL_SIZE=5

# For local email testing with Resend:
RESEND_API_KEY=re_123456789...
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### Production Configuration (Cloud Host / Secrets Manager)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://dbuser:StrongPassword@db.supabase.co:5432/postgres
DATABASE_SSL=true
DB_POOL_SIZE=10
JWT_SECRET=secure-random-32-character-production-signing-secret
APP_BASE_URL=https://surakshashe.yourdomain.com
CRON_SECRET=secure-random-16-character-cron-trigger-key

# Real Email Delivery via Resend (Production Verified Domain)
RESEND_API_KEY=re_live_production_key_here
RESEND_FROM_EMAIL=alerts@yourverifieddomain.com
RESEND_WEBHOOK_SECRET=whsec_your_resend_svix_secret

# Real SMS & WhatsApp Delivery via Twilio
TWILIO_ACCOUNT_SID=AC_production_account_sid
TWILIO_AUTH_TOKEN=production_auth_token
TWILIO_FROM_NUMBER=+14155552671
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

## 2. Core Environment Variables

| Variable | Environment | Required | Purpose |
|---|:---:|:---:|---|
| `NODE_ENV` | All | Yes | `development` (enables Vite HMR) or `production` (enables static bundle & strict security headers). |
| `DATABASE_URL` | All | Yes | PostgreSQL connection string (e.g., `postgresql://user:pass@host:port/dbname`). |
| `DATABASE_SSL` | Production | Optional | Set to `true` to enforce TLS certificate verification on managed databases. |
| `DB_POOL_SIZE` | Production | Optional | Maximum concurrent connections in the connection pool (defaults to `10`). |
| `JWT_SECRET` | All | Yes | Cryptographic secret for signing session tokens (must be >= 32 chars in production). |
| `APP_BASE_URL` | Production | Yes | Public HTTPS URL (e.g. `https://surakshashe.com`) used in emergency links, password reset links, and provider callbacks. |
| `PORT` | Production | Optional | Server port (defaults to `3000`). |

---

## 3. Real Notification Providers (Resend & Twilio)

### Resend (Email Delivery)

| Variable | Provider | Required | Purpose |
|---|:---:|:---:|---|
| `RESEND_API_KEY` | Resend | Required for Email | API key from https://resend.com/api-keys. Used for password resets, email verifications, and SOS email alerts. |
| `RESEND_FROM_EMAIL` | Resend | Required for Email | Sender address. In production, must be a domain verified in Resend (e.g., `no-reply@yourdomain.com`). In sandbox testing, `onboarding@resend.dev` can only send to the account owner. |
| `RESEND_WEBHOOK_SECRET` | Resend | Optional | Svix signing secret from Resend Webhooks settings. Used to verify status events (`email.delivered`, `email.bounced`, etc.) at `/api/webhooks/resend`. |

> **Domain Verification Note for Resend:**
> To send emails to any user's inbox in production:
> 1. Add your domain in the [Resend Domains Dashboard](https://resend.com/domains).
> 2. Add the required DNS records (DKIM, SPF, MX) to your DNS registrar (e.g. Cloudflare, Route53, Namecheap).
> 3. Once verified, configure `RESEND_FROM_EMAIL` using that domain (e.g. `alerts@surakshashe.com`).

### Twilio (SMS & WhatsApp Delivery)

| Variable | Provider | Required | Purpose |
|---|:---:|:---:|---|
| `TWILIO_ACCOUNT_SID` | Twilio | Required for SMS/WA | Account SID from https://console.twilio.com. |
| `TWILIO_AUTH_TOKEN` | Twilio | Required for SMS/WA | Authentication token for REST API requests and webhook signature verification. |
| `TWILIO_FROM_NUMBER` | Twilio | Required for SMS | Twilio phone number in E.164 format (e.g. `+14155552671`). |
| `TWILIO_WHATSAPP_FROM` | Twilio | Required for WA | Approved Twilio WhatsApp sender (e.g. `whatsapp:+14155238886`). |

---

## 4. Background Workers & Automation

| Variable | Environment | Required | Purpose |
|---|:---:|:---:|---|
| `CRON_SECRET` | Production | Recommended | Shared bearer token for authorizing automated checks on `/api/scheduled/process-check-ins`. |
| `NOTIFICATION_WORKER_INTERVAL_MS` | All | Optional | Internal worker polling interval in milliseconds (defaults to `15000` ms). |
| `NOTIFICATION_RETRY_BASE_SECONDS` | All | Optional | Base delay for exponential backoff on retryable notification failures (defaults to `15` s). |
| `SUPPORT_EMAIL` | Production | Optional | Public contact email displayed on the `/support` trust page. |

---

## 5. Security Rules

1. **No Simulated Success:** The backend fails honestly if credentials or providers are unconfigured or reject delivery.
2. **User Isolation:** `DATABASE_URL` is strictly server-side and never bundled or exposed to frontend clients.
3. **HTTPS Requirement:** In production, `APP_BASE_URL` must use `https://` to ensure cookies and emergency links remain encrypted.
4. **Token Security:** Password reset tokens are generated with 256 bits of entropy (`randomBytes(32)`), stored as HMAC-SHA256 hashes, expire in 30 minutes, and are strictly single-use.
