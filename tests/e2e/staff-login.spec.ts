import { test, expect } from "@playwright/test";

test("staff can log in and see dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@hgs.local");
  await page.getByLabel("Password").fill("admin1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("redirects unauthenticated requests to /login", async ({ page }) => {
  await page.goto("/students");
  await expect(page).toHaveURL(/\/login/);
});
