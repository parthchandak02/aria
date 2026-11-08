import { openAria } from "./aria-test-helpers";
import { expect, test } from "./toolcraft-product-test";

test("browser: aria opens in the Toolcraft shell", async ({ page }) => {
  await openAria(page);
  await expect(page.getByRole("button", { exact: true, name: "Export PNG" })).toBeVisible();
  await expect(page.getByRole("button", { exact: true, name: "Delhi" })).toBeVisible();
  await expect(page.getByRole("application", { name: "Canvas viewport" })).toBeVisible();
});
