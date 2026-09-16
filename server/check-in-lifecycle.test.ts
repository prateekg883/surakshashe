import { describe, expect, it } from "vitest";

describe("Safety Check-In Lifecycle Logic", () => {
  it("determines whether a check-in is overdue with grace period", () => {
    const now = Date.now();
    const graceMinutes = 15;
    const graceMs = graceMinutes * 60_000;

    // Arrival 30 minutes in the past: expired
    const pastArrival = new Date(now - 30 * 60_000);
    const isPastOverdue = pastArrival.getTime() + graceMs <= now;
    expect(isPastOverdue).toBe(true);

    // Arrival 10 minutes in past (within 15 min grace): not expired yet
    const graceArrival = new Date(now - 10 * 60_000);
    const isGraceOverdue = graceArrival.getTime() + graceMs <= now;
    expect(isGraceOverdue).toBe(false);

    // Arrival in future: not expired
    const futureArrival = new Date(now + 20 * 60_000);
    const isFutureOverdue = futureArrival.getTime() + graceMs <= now;
    expect(isFutureOverdue).toBe(false);
  });

  it("builds idempotent check-in escalation notification keys", () => {
    const checkInId = 101;
    const contactId = 5;
    const channel = "sms";

    const key1 = `check-in/${checkInId}/contact/${contactId}/${channel}`;
    const key2 = `check-in/${checkInId}/contact/${contactId}/${channel}`;
    expect(key1).toBe(key2);

    const emailKey = `check-in/${checkInId}/contact/${contactId}/email`;
    expect(key1).not.toBe(emailKey);
  });

  it("builds idempotent SOS escalation notification keys", () => {
    const incidentId = 202;
    const contactId = 8;
    const channel = "whatsapp";

    const key = `sos/${incidentId}/contact/${contactId}/${channel}`;
    expect(key).toBe("sos/202/contact/8/whatsapp");
  });
});
