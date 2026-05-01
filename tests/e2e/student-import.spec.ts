import { test, expect } from "@playwright/test";
import path from "node:path";

test("staff can import students from Excel", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@hgs.local");
  await page.getByLabel("Password").fill("admin1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

  await page.goto("/students/import");
  const file = path.resolve(process.cwd(), "tests/e2e/fixtures/students-2.xlsx");
  await page.setInputFiles("input[type=file]", file);
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText(/2 valid · 0 errors/)).toBeVisible();
  await page.getByRole("button", { name: /Commit/ }).click();
  await expect(page.getByText(/Imported 2 students/)).toBeVisible();

  await page.goto("/students");
  await expect(page.getByText("E2E001")).toBeVisible();
  await expect(page.getByText("E2E002")).toBeVisible();
});
