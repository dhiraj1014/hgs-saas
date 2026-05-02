"use server";

import { db } from "@/lib/db";
import { checkAndRecordOtp } from "@/lib/otp-rate-limit";
import { auth } from "@/lib/auth";
import { notificationLog } from "@/lib/db/schema/communications";

export async function requestParentOtp(phone: string): Promise<{ ok: true }> {
  // Always return generic success — never leak which numbers are registered
  if (!/^\+91\d{10}$/.test(phone)) return { ok: true };
  const limit = await checkAndRecordOtp(db, phone);
  if (limit === "rate_limited") {
    await db.insert(notificationLog).values({
      channel: "sms", templateKey: "parent_otp", recipientPhone: phone,
      status: "rate_limited", provider: "stub",
    });
    return { ok: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (auth.api as any).sendPhoneNumberOTP({ body: { phoneNumber: phone } });
  return { ok: true };
}
