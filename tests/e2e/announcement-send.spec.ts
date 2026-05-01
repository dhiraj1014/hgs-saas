import { test, expect } from "@playwright/test";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

test.afterAll(async () => { await sql.end(); });

test("super_admin sends school-wide announcement → fan-out logged + dedup applied", async ({ page }) => {
  await sql`DELETE FROM notification_log WHERE template_key = 'announcement' AND created_at > NOW() - INTERVAL '1 hour'`;
  const before = await sql`SELECT COUNT(DISTINCT phone)::int AS n FROM parent`;
  const expectedRecipients = before[0]?.n ?? 0;

  await page.goto("/login");
  await page.fill('input[type="email"]', "admin@hgs.local");
  await page.fill('input[type="password"]', "admin1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");

  await page.goto("/announcements/new");
  await page.locator('input[type="radio"]').first().check();   // Whole school
  await page.fill("textarea", "E2E test announcement");
  await page.click('button:has-text("Send")');
  await expect(page.locator(`text=/Sent to ${expectedRecipients}/`)).toBeVisible({ timeout: 5000 });

  const logs = await sql`SELECT COUNT(*)::int AS n FROM notification_log WHERE template_key = 'announcement' AND created_at > NOW() - INTERVAL '1 minute'`;
  expect(logs[0]?.n).toBe(expectedRecipients);
});
