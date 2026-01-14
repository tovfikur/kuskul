import { test, expect } from "@playwright/test";

test("Super Admin login flow", async ({ page }) => {
  // 1. Go to login page
  await page.goto("/login");

  // 2. Fill credentials
  await page.fill('input[name="email"]', "admin@kuskul.com");
  await page.fill('input[name="password"]', "password123");

  // 3. Click Sign In
  await page.click('button[type="submit"]');

  // 4. Verify redirect to dashboard
  await expect(page).toHaveURL("/");

  // 5. Verify Dashboard content
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // 6. Verify stats cards (optional check for content)
  await expect(page.getByText("Total Students")).toBeVisible();

  // 7. Navigate to Academic Management and verify key tabs render
  const academicNav = page.getByRole("button", { name: "Academic" });
  if (!(await academicNav.isVisible())) {
    const openDrawer = page.getByLabel("open drawer");
    if (await openDrawer.isVisible()) {
      await openDrawer.click();
    }
  }
  await page.getByRole("button", { name: "Academic" }).click();
  await expect(page).toHaveURL("/academic");

  await expect(
    page.getByRole("heading", { name: "Academic Management" })
  ).toBeVisible();
  await expect(
    page
      .locator('[aria-label="Academic content"]')
      .getByText("Academic Years", { exact: true })
  ).toBeVisible();

  const desktopModules = page.locator('[aria-label="Academic modules"]');
  if (await desktopModules.isVisible()) {
    await desktopModules.getByRole("button", { name: "Streams" }).click();
    await expect(
      page
        .locator('[aria-label="Academic content"]')
        .getByText("Streams", { exact: true })
    ).toBeVisible();
  }
});
