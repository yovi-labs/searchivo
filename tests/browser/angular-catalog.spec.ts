import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("10k Angular catalog searches real indexes, recovers typos and pages filtered products", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#catalog");
  const input = page.getByRole("searchbox", { name: "Search products" });
  await expect(page.getByRole("status")).toContainText("10,000 products");
  await expect(page.locator("article")).toHaveCount(24);
  const first = await page.locator(".sku").first().textContent();
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await expect(page.locator(".sku").first()).not.toHaveText(first!);
  await input.fill("SKU00001");
  await expect(page.getByRole("status")).toContainText("1 products");
  await expect(page.locator("article")).toContainText(
    "Nova Wireless Headphones",
  );
  await expect(
    page.getByRole("button", { name: "← Previous", exact: true }),
  ).toBeDisabled();
  await input.fill("headphnoes");
  await expect(page.locator(".correction")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("250 products");
  await page.getByRole("button", { name: "Reset all", exact: true }).click();
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Electronics");
  await expect(page.getByRole("status")).toContainText("1,250 products");
  await page.getByLabel("In stock only").check();
  await expect(page.locator("article .unavailable")).toHaveCount(0);
  await page.getByLabel("Sort products").selectOption("price-asc");
  const prices = await page.locator(".card-bottom strong").allTextContents();
  const values = prices.map((price) => Number(price.replace(/[^\d.]/g, "")));
  expect(values).toEqual([...values].sort((a, b) => a - b));
  await input.fill("zzzzunfindablezzzz");
  await expect(
    page.getByRole("heading", { name: "No discoveries just yet." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore all products" }).click();
  await expect(page.getByRole("status")).toContainText("10,000 products");
  expect(errors).toEqual([]);
});

test("10k Angular catalog supports IME, keyboard, accessibility and mobile layout", async ({
  page,
}) => {
  await page.goto("/#catalog");
  const input = page.getByRole("searchbox", { name: "Search products" });
  await input.dispatchEvent("compositionstart");
  await input.fill("coffee");
  await page.waitForTimeout(180);
  await expect(page.getByRole("status")).toContainText("10,000 products");
  await input.dispatchEvent("compositionend");
  await expect(page.getByRole("status")).toContainText("250 products");
  await expect(input).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: "artifacts/catalog-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/catalog-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Feature lab ↗" }).click();
  await expect(
    page.getByRole("heading", { name: "Search, inspect, integrate." }),
  ).toBeVisible();
});
