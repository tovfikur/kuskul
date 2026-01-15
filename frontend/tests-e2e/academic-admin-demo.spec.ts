import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@kuskul.com";
const ADMIN_PASSWORD = "password123";
const DEMO_SCHOOL_NAME = "Demo School";
const DEMO_ACADEMIC_YEAR = "2024";

test("Super Admin can see demo data in academic dashboard", async ({ page }) => {
  // Go to login page
  await page.goto("/login");

  // Login as admin
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for dashboard
  await expect(page).toHaveURL(/dashboard/);

  // Select Demo School in Active School dropdown
  await page.click('label:has-text("Active School") + div [role="button"]');
  await page.getByRole("option", { name: DEMO_SCHOOL_NAME }).click();

  // Go to Academic page
  await page.click('a[href="/academic"]');
  await expect(page).toHaveURL(/academic/);

  // Check for demo academic year
  await expect(page.getByText(DEMO_ACADEMIC_YEAR)).toBeVisible();
});
