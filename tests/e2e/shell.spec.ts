import { expect, test } from "@playwright/test";

test("renders the Scout commercial shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Where should Scout hunt next/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "New mission", exact: true }).last()).toBeVisible();
  await expect(page.getByText("Standalone MVP · Act 1")).not.toBeVisible();
});
