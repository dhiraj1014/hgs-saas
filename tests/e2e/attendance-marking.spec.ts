import { test, expect } from "@playwright/test";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

test.afterAll(async () => { await sql.end(); });

test("class teacher marks two absent → notifications logged", async ({ page }) => {
  // Use today's date and make sure we start clean for it
  const today = new Date().toISOString().slice(0, 10);
  await sql`DELETE FROM attendance WHERE date = ${today}`;
  await sql`DELETE FROM notification_log WHERE template_key IN ('attendance_absent','attendance_late') AND created_at > NOW() - INTERVAL '1 hour'`;

  await page.goto("/login");
  await page.fill('input[type="email"]', "teacher@hgs.local");
  await page.fill('input[type="password"]', "teacher1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");

  await page.goto("/attendance");
  await expect(page.locator("h1")).toContainText("Attendance");
  // Mark first two students absent — radios are controlled components; click the label text
  const rows = page.locator("table tbody tr");
  await expect(rows.first()).toBeVisible();
  await rows.nth(0).locator('label:has-text("absent") input[type="radio"]').click();
  await rows.nth(1).locator('label:has-text("absent") input[type="radio"]').click();
  await page.click('button:has-text("Save attendance")');
  await expect(page.locator("text=/Marked .* notified/")).toBeVisible({ timeout: 5000 });

  // Verify DB: 2 attendance rows for today, 2 notification_log rows for absent
  const attRows = await sql`SELECT COUNT(*)::int AS n FROM attendance WHERE date = ${today} AND status = 'absent'`;
  expect(attRows[0]?.n).toBeGreaterThanOrEqual(2);
  const notifRows = await sql`SELECT COUNT(*)::int AS n FROM notification_log WHERE template_key = 'attendance_absent' AND created_at > NOW() - INTERVAL '1 minute'`;
  expect(notifRows[0]?.n).toBeGreaterThanOrEqual(2);
});
