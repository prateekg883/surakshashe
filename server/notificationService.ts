import type { EmergencyContact, SosAlert } from "../drizzle/schema";

export type NotificationChannel = "sms" | "email" | "whatsapp";
export type DeliveryResult = {
  channel: NotificationChannel;
  status: "sent" | "delivered" | "failed";
  providerMessageId?: string;
  errorMessage?: string;
  retryable?: boolean;
};

const appBaseUrl = () => process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL || "";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export function isSmsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

export function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [name, domain] = parts;
  const maskedName = name.length <= 2 ? `${name[0] || "*"}*` : `${name[0]}***${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}

function incidentMessage(userName: string, alert: SosAlert, emergencyLink: string) {
  return `EMERGENCY SOS from ${userName}. Location: ${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}. ${alert.address || "Open the secure emergency link for the live incident."} ${emergencyLink}`;
}

export async function sendEmail(to: string, subject: string, text: string, idempotencyKey?: string, html?: string): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    const missing: string[] = [];
    if (!apiKey) missing.push("RESEND_API_KEY");
    if (!from) missing.push("RESEND_FROM_EMAIL");
    const errorMsg = `Email provider is not configured (${missing.join(", ")} missing in environment).`;
    console.warn(`[Resend Email] Cannot send email to ${maskEmail(to)}: ${errorMsg}`);
    return { channel: "email", status: "failed", errorMessage: errorMsg };
  }

  console.log(`[Resend Email] Dispatching email to ${maskEmail(to)} with subject "${subject}" from "${from}"...`);

  try {
    const payload: { from: string; to: string[]; subject: string; text: string; html?: string } = {
      from,
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorDetail = body?.message || body?.error || `HTTP ${response.status}`;
      console.error(`[Resend Email] Provider rejected request for ${maskEmail(to)} (HTTP ${response.status}): ${errorDetail}`);
      return {
        channel: "email",
        status: "failed",
        errorMessage: `Email provider error (${response.status}): ${errorDetail}`,
        retryable: response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500,
      };
    }

    if (typeof body.id !== "string" || body.id.length < 1) {
      console.error(`[Resend Email] Provider accepted request but returned no message identifier:`, body);
      return { channel: "email", status: "failed", errorMessage: "Email provider returned no message identifier." };
    }

    console.log(`[Resend Email] Message accepted by Resend provider. Message ID: ${body.id}`);
    return { channel: "email", status: "sent", providerMessageId: body.id };
  } catch (error: any) {
    const errMessage = error?.message || "Request timeout or network error";
    console.error(`[Resend Email] Network request failed for ${maskEmail(to)}: ${errMessage}`);
    return { channel: "email", status: "failed", errorMessage: `Email provider request failed: ${errMessage}`, retryable: true };
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<DeliveryResult> {
  const plainText = `We received a password reset request for your SurakshaShe account.\n\nReset your password here: ${resetLink}\n\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset your SurakshaShe password</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fbf8f7; margin: 0; padding: 40px 20px;">
  <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="display: inline-block; background-color: #e11d48; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 16px; margin-bottom: 24px;">
      SurakshaShe
    </div>
    <h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 16px 0;">Reset your password</h1>
    <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0;">
      We received a request to reset your password for your SurakshaShe safety account. Click the button below to choose a new password:
    </p>
    <div style="margin: 32px 0;">
      <a href="${resetLink}" style="background-color: #e11d48; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color: #64748b; font-size: 13px; line-height: 20px; margin: 0 0 16px 0;">
      This link will expire in <strong>30 minutes</strong>. If you did not request this password reset, please ignore this email; your account remains secure.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0; word-break: break-all;">
      If the button above does not work, copy and paste this link into your browser:<br/>
      <a href="${resetLink}" style="color: #e11d48;">${resetLink}</a>
    </p>
  </div>
</body>
</html>`;

  return sendEmail(to, "Reset your SurakshaShe password", plainText, undefined, html);
}

export function cleanPhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export function formatWhatsAppAddress(address: string): string {
  const trimmed = address.trim();
  const withoutPrefix = trimmed.replace(/^whatsapp:/i, "").trim();
  const normalizedPhone = cleanPhoneNumber(withoutPrefix);
  return `whatsapp:${normalizedPhone}`;
}

async function sendTwilio(to: string, body: string, channel: "sms" | "whatsapp", idempotencyKey?: string): Promise<DeliveryResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = channel === "whatsapp" ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_FROM_NUMBER;
  if (!sid || !auth || !from) {
    const missing: string[] = [];
    if (!sid) missing.push("TWILIO_ACCOUNT_SID");
    if (!auth) missing.push("TWILIO_AUTH_TOKEN");
    if (!from) missing.push(channel === "whatsapp" ? "TWILIO_WHATSAPP_FROM" : "TWILIO_FROM_NUMBER");
    const errorMsg = `${channel === "sms" ? "SMS" : "WhatsApp"} provider is not configured (${missing.join(", ")} missing in environment).`;
    console.warn(`[Twilio ${channel.toUpperCase()}] Cannot send notification: ${errorMsg}`);
    return { channel, status: "failed", errorMessage: errorMsg };
  }

  try {
    const formattedTo = channel === "whatsapp" ? formatWhatsAppAddress(to) : cleanPhoneNumber(to);
    const formattedFrom = channel === "whatsapp" ? formatWhatsAppAddress(from) : cleanPhoneNumber(from);
    const payload = new URLSearchParams({ To: formattedTo, From: formattedFrom, Body: body });
    const callbackBase = process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL;
    if (callbackBase) payload.set("StatusCallback", `${callbackBase.replace(/\/$/, "")}/api/webhooks/twilio/status`);

    console.log(`[Twilio ${channel.toUpperCase()}] Dispatching message via Twilio API from ${formattedFrom}...`);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: payload,
      signal: AbortSignal.timeout(15_000),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = result?.message || `HTTP ${response.status}${result?.code ? ` (Code ${result.code})` : ""}`;
      console.error(`[Twilio ${channel.toUpperCase()}] Provider rejected request (HTTP ${response.status}): ${errorMsg}`);
      return {
        channel,
        status: "failed",
        errorMessage: `Twilio provider error: ${errorMsg}`,
        retryable: response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500,
      };
    }

    if (typeof result.sid !== "string" || result.sid.length < 1) {
      console.error(`[Twilio ${channel.toUpperCase()}] Provider returned invalid SID:`, result);
      return { channel, status: "failed", errorMessage: "Twilio provider returned no message identifier." };
    }

    console.log(`[Twilio ${channel.toUpperCase()}] Message accepted by Twilio. SID: ${result.sid}`);
    return { channel, status: "sent", providerMessageId: result.sid };
  } catch (error: any) {
    const errMessage = error?.message || "Request timeout or network error";
    console.error(`[Twilio ${channel.toUpperCase()}] Network request failed: ${errMessage}`);
    return { channel, status: "failed", errorMessage: `Twilio request failed: ${errMessage}`, retryable: true };
  }
}

export async function sendVerificationNotification(kind: "email" | "phone", destination: string, code: string): Promise<DeliveryResult> {
  if (kind === "email") {
    const plainText = `Your SurakshaShe verification code is ${code}. It expires in 15 minutes.`;
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verify your SurakshaShe contact</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fbf8f7; margin: 0; padding: 40px 20px;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px;">
    <div style="display: inline-block; background-color: #e11d48; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px; margin-bottom: 20px;">
      SurakshaShe Verification
    </div>
    <h2 style="color: #0f172a; margin: 0 0 12px 0;">Verify your contact details</h2>
    <p style="color: #475569; font-size: 14px; line-height: 22px;">Use the code below to verify your email address on SurakshaShe:</p>
    <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
      <span style="font-family: monospace; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #0f172a;">${code}</span>
    </div>
    <p style="color: #64748b; font-size: 12px;">This code will expire in <strong>15 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
  </div>
</body>
</html>`;
    return sendEmail(destination, "Verify your SurakshaShe contact", plainText, undefined, html);
  }
  return sendTwilio(destination, `Your SurakshaShe verification code is ${code}. It expires in 15 minutes.`, "sms", `verification/${kind}/${destination}/${code}`);
}

export async function sendContactMessage(channel: NotificationChannel, contact: EmergencyContact, subject: string, body: string, idempotencyKey?: string): Promise<DeliveryResult> {
  if (channel === "email") {
    if (!contact.email) return { channel, status: "failed", errorMessage: "Contact has no email address." };
    return sendEmail(contact.email, subject, body, idempotencyKey);
  }
  if (!contact.phone) return { channel, status: "failed", errorMessage: "Contact has no phone number." };
  return sendTwilio(contact.phone, body, channel, idempotencyKey);
}

export async function sendNotification(channel: NotificationChannel, contact: EmergencyContact, userName: string, alert: SosAlert, emergencyToken: string, idempotencyKey?: string): Promise<DeliveryResult> {
  const link = appBaseUrl() ? `${appBaseUrl()}/emergency/${encodeURIComponent(emergencyToken)}` : "Open the SurakshaShe emergency link from the alert.";
  const body = incidentMessage(userName, alert, link);
  if (channel === "email") {
    if (!contact.email) return { channel, status: "failed", errorMessage: "Contact has no email address." };
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>EMERGENCY SOS ALERT</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fff1f2; margin: 0; padding: 30px 15px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 2px solid #e11d48; border-radius: 16px; padding: 28px; box-shadow: 0 10px 15px -3px rgba(225,29,72,0.1);">
    <div style="background-color: #e11d48; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 16px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
      EMERGENCY SOS ALERT
    </div>
    <h2 style="color: #0f172a; margin: 20px 0 10px 0; font-size: 20px;">Emergency from ${userName}</h2>
    <p style="color: #334155; font-size: 15px; line-height: 24px; margin-bottom: 20px;">
      ${userName} has activated an emergency SOS alert and listed you as a trusted contact.
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;"><strong>Location:</strong> ${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}</p>
      ${alert.address ? `<p style="margin: 0; font-size: 14px; color: #475569;"><strong>Address:</strong> ${alert.address}</p>` : ""}
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${link}" style="background-color: #e11d48; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block;">
        Open Live Incident Dashboard
      </a>
    </div>
    <p style="color: #64748b; font-size: 12px; line-height: 18px; margin: 0;">
      If you are in immediate danger or suspect a serious crime, contact local emergency services (112 / 100 / 1091) immediately.
    </p>
  </div>
</body>
</html>`;
    return sendEmail(contact.email, `EMERGENCY SOS from ${userName}`, body, idempotencyKey, html);
  }
  if (!contact.phone) return { channel, status: "failed", errorMessage: "Contact has no phone number." };
  return sendTwilio(contact.phone, body, channel, idempotencyKey);
}

export async function sendResponderDestinationNotification(
  channel: NotificationChannel,
  destination: { name: string; phone?: string | null; email?: string | null },
  incidentTitle: string,
  message: string,
  idempotencyKey?: string
): Promise<DeliveryResult> {
  if (channel === "email") {
    if (!destination.email) return { channel, status: "failed", errorMessage: `Destination ${destination.name} has no email configured.` };
    return sendEmail(destination.email, incidentTitle, message, idempotencyKey);
  }
  if (!destination.phone) return { channel, status: "failed", errorMessage: `Destination ${destination.name} has no phone configured.` };
  return sendTwilio(destination.phone, message, channel, idempotencyKey);
}
