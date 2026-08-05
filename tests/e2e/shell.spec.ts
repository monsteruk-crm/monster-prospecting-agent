import { expect, test } from "@playwright/test";

test("renders the Act 1 mission control shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /next Monster deal/i })).toBeVisible();
  await expect(page.getByText("Standalone MVP · Act 1")).toBeVisible();
  await expect(page.getByLabel("Mission run ID")).toBeVisible();
  await expect(page.getByRole("button", { name: /AI Gateway smoke test/i })).toBeVisible();
});
