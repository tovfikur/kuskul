import { test, expect } from "@playwright/test";

test("Super Admin login flow", async ({ page }) => {
  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "test-token",
        token_type: "bearer",
      }),
    });
  });

  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user_id: "1",
        email: "admin@kuskul.com",
        memberships: [
          {
            school_id: "school-1",
            role_id: "role-1",
            school_name: "Test School",
          },
        ],
      }),
    });
  });

  await page.goto("/login");

  await page.fill('input[name="email"]', "admin@kuskul.com");
  await page.fill('input[name="password"]', "password123");

  await page.click('button[type="submit"]');

  await expect(page).toHaveURL("/");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await expect(page.getByText("Total Students")).toBeVisible();

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
});

test("shows error alert on invalid login", async ({ page }) => {
  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Invalid credentials" }),
    });
  });

  await page.goto("/login");
  await page.fill('input[name="email"]', "wrong@example.com");
  await page.fill('input[name="password"]', "wrongpassword");
  await page.click('button[type="submit"]');

  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(
    /Login failed|Request failed|Unexpected server response/
  );
});
