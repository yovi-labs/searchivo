import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Market opens at the root, saves products and filters them across refresh", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Find your next/ }),
  ).toBeVisible();
  const card = page.locator("article").first();
  const name = (await card.locator("h3").innerText()).trim();
  const id = (await card.locator(".sku").innerText()).trim();
  await card.getByRole("button", { name: "Save " + name, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saved (1)", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Saved (1)", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator(".sku")).toHaveText(id);
  await page
    .locator("article")
    .getByRole("button", { name: "Saved " + name, exact: true })
    .click();
  await expect(page.locator("article")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Saved (0)", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Explore all products" }).click();
  await expect(page.locator("article")).toHaveCount(24);
});

test("product details support keyboard focus, saving and accessible mobile layout", async ({
  page,
}) => {
  await page.goto("/");
  const open = page
    .locator("article")
    .first()
    .getByRole("button", { name: /^View / });
  await open.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Fictional demonstration product");
  await dialog
    .getByRole("button", { name: "Save this product", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Remove from saved products" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "artifacts/market-details-mobile.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("saved products tolerate corrupt and unavailable browser storage", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("searchivo-market:saved:v1", "invalid-json"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Saved (0)", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage unavailable");
    };
  });
  await page
    .locator("article")
    .first()
    .getByRole("button", { name: /^Save / })
    .click();
  await expect(
    page.getByRole("button", { name: "Saved (1)", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".action-message")).toHaveText(
    "Saved for this session. Browser storage is unavailable.",
  );
});
