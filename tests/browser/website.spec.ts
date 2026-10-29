import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ baseURL: "http://127.0.0.1:4174" });
test("guided experiments reset controls and copy real configuration", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/playground/");
  await page.getByRole("button", { name: /Recover a misspelling/ }).click();
  await expect(page.locator("#query")).toHaveValue("iphnoe");
  await expect(page.locator("#results")).toContainText("iPhone");
  await expect(page.locator("#query-tokens")).toContainText("iphone");
  await page.getByRole("button", { name: /Look inside BM25/ }).click();
  await expect(page.locator("#ranking")).toHaveValue("bm25");
  await expect(page.locator("#explanation")).toContainText("contributions");
  await page.getByRole("button", { name: "Copy configuration" }).click();
  await expect(page.locator("#copy-status")).toHaveText(
    "Configuration copied.",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "ranking: bm25",
  );
  await page.getByRole("button", { name: /Run ranking in a worker/ }).click();
  await expect(page.locator("#execution-note")).toContainText("Worker ranking");
  await expect(page.locator("#results")).toContainText("Laptop");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator("#query")).toHaveValue("phone");
  await expect(page.locator("#execution")).toHaveValue("local");
  await expect(page.locator("#ranking")).toHaveValue("default");
  await expect(page.locator("#fuzzy")).not.toBeChecked();
  await expect(page.locator("#explain")).not.toBeChecked();
  await page.setViewportSize({ width: 1440, height: 1120 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/playground-readme.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: "artifacts/playground-mobile.png",
    fullPage: true,
  });
});
test("documentation topic search, empty state, learning paths and copy", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/");
  await page.setViewportSize({ width: 1440, height: 1120 });
  await page.screenshot({ path: "artifacts/documentation-readme.png" });
  const search = page.getByRole("searchbox", { name: "Find in the guide" });
  await search.fill("zzz-no-such-topic");
  await expect(page.locator("#docs-empty")).toBeVisible();
  await expect(page.locator("[data-doc-section]:visible")).toHaveCount(0);
  await search.fill("Abort abandons");
  await expect(page.locator("[data-doc-section]:visible")).toHaveCount(1);
  await expect(page.locator("[data-doc-section]:visible h2")).toHaveText(
    "Workers",
  );
  await page.getByRole("link", { name: /Your first search/ }).click();
  await expect(search).toHaveValue("");
  await expect(page.locator("[data-doc-section]:visible")).toHaveCount(13);
  await page
    .getByRole("button", { name: "Copy code", exact: true })
    .first()
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "createSearchEngine",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBe(true);
});
test("homepage real search, accessibility and responsive layout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("framework");
  await expect(page.locator("#home-results")).toContainText("Framework");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: "artifacts/website-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/website-mobile.png",
    fullPage: true,
  });
});
test("playground suggestions, fuzzy, explanations and worker parity", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/playground/");
  const query = page.getByRole("combobox", { name: "Search products" });
  await query.fill("iph");
  await query.press("ArrowDown");
  await query.press("Enter");
  await expect(query).toHaveValue("iphone");
  await expect(query).toBeFocused();
  await page.locator("#fuzzy").check();
  await query.fill("iphnoe");
  await expect(page.locator("#results")).toContainText("iPhone");
  await page.locator("#ranking").selectOption("bm25");
  await page.locator("#explain").check();
  await expect(page.locator("#explanation")).toContainText("contributions");
  const local = await page.locator("#results").innerText();
  await page.locator("#execution").selectOption("worker");
  await expect(page.locator("#execution-note")).toContainText("Worker ranking");
  await expect.poll(() => page.locator("#results").innerText()).toBe(local);
  await page.locator("#category").selectOption("Computers");
  await expect(page.locator("#results")).toContainText("No matches");
  await page.locator("#category").selectOption("");
  await query.fill("apple");
  await expect(page.locator("#results article")).toHaveCount(3);
  await page.locator("#stock").check();
  await expect(page.locator("#results article")).toHaveCount(2);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: "artifacts/playground-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("pagination, minimum length and safe rendering", async ({ page }) => {
  await page.goto("/playground/");
  const query = page.getByRole("combobox", { name: "Search products" });
  await query.fill("apple phone laptop");
  await expect(page.locator("#results article")).toHaveCount(3);
  await page.locator("#next").click();
  await expect(page.locator("#page-status")).toHaveText("Page 2");
  await page.locator("#sort").selectOption("price");
  await expect(page.locator("#page-status")).toHaveText("Page 1");
  await page.locator("#boost").fill("0");
  await page.locator("#boost").blur();
  await expect(page.locator("#search-status")).toContainText("Invalid setting");
  await page.locator("#boost").fill("3");
  await page.locator("#boost").blur();
  await expect(page.locator("#search-status")).not.toContainText(
    "Invalid setting",
  );
  await page.locator("#minimum").fill("5");
  await page.locator("#minimum").blur();
  await query.fill("a");
  await expect(page.locator("#results")).toContainText("Enter a query");
  await query.fill("<img src=x onerror=alert(1)>");
  await expect(page.locator("#results img")).toHaveCount(0);
  await query.press("Escape");
  await expect(query).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBe(true);
});
