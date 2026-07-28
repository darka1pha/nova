import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/en");

  await expect(page).toHaveTitle(/Enterprise|Next|App/i);
  await expect(page.getByRole("banner")).toBeVisible();
});
