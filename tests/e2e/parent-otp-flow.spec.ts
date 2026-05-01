import { test, expect } from "@playwright/test";
import postgres from "postgres";

const SAMPLE_PHONE = "+919999999999";
const sql = postgres(process.env.DATABASE_URL!);

test.beforeEach(async () => {
  // Ensure stub notifier path is taken (default in dev) — clear past attempts and logs for this phone
  await sql`DELETE FROM otp_attempt WHERE phone = ${SAMPLE_PHONE}`;
  await sql`DELETE FROM notification_log WHERE recipient_phone = ${SAMPLE_PHONE}`;
});

test.afterAll(async () => { await sql.end(); });

test("parent OTP login lands on dashboard with linked child", async ({ page }) => {
  await page.goto("/parent-login");
  await page.fill('input[inputmode="numeric"]', "9999999999");
  await page.click('button:has-text("Send code")');
  await page.waitForURL("**/parent-login/verify**");

  // Pull the OTP code from notification_log — the stub notifier persists it in provider_message_id
  // (see notifier/stub.ts; this is dev/test-only behavior).
  const rows = await sql`SELECT provider_message_id FROM notification_log WHERE recipient_phone = ${SAMPLE_PHONE} AND template_key = 'parent_otp' AND provider = 'stub' ORDER BY created_at DESC LIMIT 1`;
  const code = rows[0]?.provider_message_id as string;
  expect(code).toBeTruthy();
  expect(code).toMatch(/^\d{6}$/);

  await page.fill('input[inputmode="numeric"]', code);
  await page.click('button:has-text("Verify")');
  await page.waitForURL("**/parent/dashboard");
  await expect(page.locator("h1")).toContainText("Welcome");
});

test("OTP request for unregistered phone returns generic success", async ({ page }) => {
  await page.goto("/parent-login");
  await page.fill('input[inputmode="numeric"]', "9888888888");
  await page.click('button:has-text("Send code")');
  await page.waitForURL("**/parent-login/verify**");
  // Should land on the verify page even though no parent row exists for that phone
});
