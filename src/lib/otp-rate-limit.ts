import { eq, sql } from "drizzle-orm";
import type { DB } from "./db";
import { otpAttempt } from "./db/schema/communications";

const MAX_PER_HOUR = 3;
const MAX_PER_DAY = 10;

export type OtpCheckResult = "ok" | "rate_limited";

export async function checkAndRecordOtp(db: DB, phone: string): Promise<OtpCheckResult> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const counts = await db
    .select({
      hour: sql<number>`count(*) filter (where ${otpAttempt.attemptedAt} >= ${oneHourAgo})`,
      day: sql<number>`count(*) filter (where ${otpAttempt.attemptedAt} >= ${oneDayAgo})`,
    })
    .from(otpAttempt)
    .where(eq(otpAttempt.phone, phone));

  const hourCount = Number(counts[0]?.hour ?? 0);
  const dayCount = Number(counts[0]?.day ?? 0);

  if (hourCount >= MAX_PER_HOUR || dayCount >= MAX_PER_DAY) return "rate_limited";

  await db.insert(otpAttempt).values({ phone });
  return "ok";
}
