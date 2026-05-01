import { describe, it, expect } from "vitest";
import { freshTestDb } from "../helpers/pglite";
import { checkAndRecordOtp } from "@/lib/otp-rate-limit";
import { otpAttempt } from "@/lib/db/schema/communications";

describe("OTP rate limit", () => {
  it("first 3 attempts in same hour are allowed; 4th is rate_limited", async () => {
    const { db } = await freshTestDb();
    expect(await checkAndRecordOtp(db, "+919000000001")).toBe("ok");
    expect(await checkAndRecordOtp(db, "+919000000001")).toBe("ok");
    expect(await checkAndRecordOtp(db, "+919000000001")).toBe("ok");
    expect(await checkAndRecordOtp(db, "+919000000001")).toBe("rate_limited");
    const rows = await db.select().from(otpAttempt);
    expect(rows.length).toBe(3);    // rate-limited attempt is NOT recorded
  });

  it("different phones don't interfere", async () => {
    const { db } = await freshTestDb();
    for (let i = 0; i < 3; i++) await checkAndRecordOtp(db, "+919000000001");
    expect(await checkAndRecordOtp(db, "+919000000002")).toBe("ok");
  });

  it("daily limit of 10 is enforced beyond hourly", async () => {
    const { db } = await freshTestDb();
    // Insert 10 attempts manually within the past 24h (older than 1h to avoid hourly limit interference)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    for (let i = 0; i < 10; i++) {
      await db.insert(otpAttempt).values({ phone: "+919000000099", attemptedAt: twoHoursAgo });
    }
    expect(await checkAndRecordOtp(db, "+919000000099")).toBe("rate_limited");
  });
});
