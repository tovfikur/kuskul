import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("/login");

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/KusKul/);
});

test("login page has sign in button", async ({ page }) => {
  await page.goto("/login");

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
});
