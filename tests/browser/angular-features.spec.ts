import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Angular inputs share query, filters, pages and diagnostics", async ({
  page,
}) => {
  await page.goto("/#features");
  const catalog = page.getByRole("searchbox", {
    name: "Search feature catalog",
  });
  const bound = page.getByRole("searchbox", { name: "Bound query" });
  await catalog.fill("apple");
  await expect(page.getByRole("status")).toHaveText("2 matches");
  await page.getByRole("button", { name: "Programmatic Pixel" }).click();
  await expect(catalog).toHaveValue("Pixel");
  await expect(bound).toHaveValue("Pixel");
  await expect(page.locator("article mark")).toHaveText("Pixel");
  await page.getByText("Explain Search", { exact: true }).click();
  await expect(page.locator("pre").first()).toContainText(
    '"normalizedQuery": "pixel"',
  );
  await expect(
    page.getByRole("button", { name: "pixel", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Sort", { exact: true }).selectOption("Price");
  await expect(page.locator("article")).toContainText("Pixel");
  await page.getByLabel("Category", { exact: true }).selectOption("Computers");
  await bound.fill("phone");
  await expect(catalog).toHaveValue("phone");
  await expect(page.getByRole("status")).toHaveText("0 matches");
  await page.getByRole("button", { name: "Programmatic Pixel" }).click();
  await expect(page.getByRole("status")).toHaveText("0 matches");
  await page.getByLabel("Category", { exact: true }).selectOption("");
  await page.getByLabel("Page size", { exact: true }).selectOption("1");
  await bound.fill("apple");
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.locator("article")).toContainText("MacBook");
  await bound.fill("phone");
  await expect(
    page.getByRole("button", { name: "Previous page" }),
  ).toBeDisabled();
  await expect(page.locator("article")).toContainText("Pixel");
});

test("Angular cancel suppresses debounce and immediate queries supersede pending input", async ({
  page,
}) => {
  await page.goto("/#features");
  const catalog = page.getByRole("searchbox", {
    name: "Search feature catalog",
  });
  // Dispatch in one task so the click is guaranteed to precede the debounce timer.
  await expect(catalog).toBeVisible();
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>("#lab-query")!;
    input.value = "phone";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "Cancel")!
      .click();
  });
  await page.waitForTimeout(200);
  await expect(page.getByRole("status")).toHaveText("0 matches");
  await expect(
    page.getByRole("button", { name: "phone", exact: true }),
  ).toHaveCount(0);
  await catalog.fill("pixel");
  await expect(page.locator("article")).toContainText("Pixel");
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>("#lab-query")!;
    input.value = "apple";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "Programmatic Pixel")!
      .click();
  });
  await page.waitForTimeout(200);
  await expect(catalog).toHaveValue("Pixel");
  await expect(page.locator("article")).toContainText("Pixel");
});

test("Angular ranking changes retain additions, updates, removals and cleared state", async ({
  page,
}) => {
  await page.goto("/#features");
  const catalog = page.getByRole("searchbox", {
    name: "Search feature catalog",
  });
  const ranking = page.getByLabel("Ranking", { exact: true });
  await catalog.fill("added");
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await ranking.selectOption("Weighted");
  await expect(page.locator("article")).toContainText("Added phone");
  await page
    .getByRole("button", { name: "Update document", exact: true })
    .click();
  await catalog.fill("updated");
  await page.getByLabel("Name boost", { exact: true }).fill("5");
  await page.getByLabel("Name boost", { exact: true }).blur();
  await expect(page.locator("article")).toContainText("Updated phone");
  await expect(page.locator("article")).toContainText("score 5");
  await page
    .getByRole("button", { name: "Remove document", exact: true })
    .click();
  await ranking.selectOption("BM25");
  await expect(page.getByRole("status")).toHaveText("0 matches");
  await page.getByRole("button", { name: "Clear index", exact: true }).click();
  await ranking.selectOption("Weighted");
  await catalog.fill("phone");
  await expect(page.getByRole("status")).toHaveText("0 matches");
  await page.getByRole("button", { name: "Reset index", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("2 matches");
});

test("Angular add works after clear and does not replace an existing ID", async ({
  page,
}) => {
  await page.goto("/#features");
  await page.getByRole("button", { name: "Clear index", exact: true }).click();
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search feature catalog" })
    .fill("phone");
  await expect(page.getByRole("status")).toHaveText("1 matches");
  await expect(page.locator("article")).toContainText("Added phone");
  await page
    .getByRole("button", { name: "Update document", exact: true })
    .click();
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("1 matches");
  await expect(page.locator("article")).toContainText("Updated phone");
});

test("Angular catalog buffers IME input and cancels pre-composition debounce", async ({
  page,
}) => {
  await page.goto("/#features");
  const catalog = page.getByRole("searchbox", {
    name: "Search feature catalog",
  });
  await catalog.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "apple";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    input.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    input.value = "phone";
    input.dispatchEvent(
      new InputEvent("input", { bubbles: true, isComposing: true }),
    );
  });
  await page.waitForTimeout(200);
  await expect(page.getByRole("status")).toHaveText("0 matches");
  await expect(catalog).toHaveValue("phone");
  await page.getByRole("button", { name: "Programmatic Pixel" }).click();
  await expect(page.locator("article")).toContainText("Pixel");
  await expect(catalog).toHaveValue("phone");
  await catalog.dispatchEvent("compositionend");
  await expect(page.getByRole("status")).toHaveText("2 matches");
  await expect(
    page.getByRole("searchbox", { name: "Bound query" }),
  ).toHaveValue("phone");
});
test("Angular catalog: ranking, fuzzy, refinements, pages, suggestions and diagnostics", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#features");
  const query = page.getByRole("searchbox", { name: "Search feature catalog" });
  await query.fill("apple");
  await expect(page.getByRole("status")).toHaveText("2 matches");
  await expect(page.locator("article mark")).toHaveCount(2);
  await page.getByLabel("Page size", { exact: true }).selectOption("1");
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.locator("article")).toContainText("MacBook");
  await page.getByLabel("Category", { exact: true }).selectOption("Phones");
  await expect(page.getByRole("status")).toHaveText("1 matches");
  await page.getByLabel("Category", { exact: true }).selectOption("");
  await page.getByLabel("Maximum price", { exact: true }).fill("1000");
  await page.getByLabel("Maximum price", { exact: true }).blur();
  await expect(page.getByRole("status")).toHaveText("1 matches");
  await page.getByLabel("Maximum price", { exact: true }).fill("2000");
  await page.getByLabel("Maximum price", { exact: true }).blur();
  await page.getByLabel("Sort", { exact: true }).selectOption("Price");
  await expect(page.locator("article")).toContainText("iPhone");
  await page.getByLabel("Ranking", { exact: true }).selectOption("Weighted");
  await page.getByLabel("Name boost", { exact: true }).fill("5");
  await page.getByLabel("Name boost", { exact: true }).blur();
  await expect(page.locator("article")).toContainText("score 5");
  await page.getByLabel("Fuzzy matching", { exact: true }).check();
  await query.fill("iphnoe");
  await expect(page.locator("article")).toContainText("iPhone");
  await query.fill("pix");
  await expect(
    page.getByRole("button", { name: "pixel", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "pixel", exact: true }).click();
  await expect(page.locator("article")).toContainText("Pixel");
  await page.getByText("Explain Search", { exact: true }).click();
  await expect(page.locator("pre").first()).toContainText("contributions");
  await page.getByText("DevTools transitions", { exact: true }).click();
  await expect(page.locator("pre").last()).toContainText("pixel");
  await page.getByRole("button", { name: "Programmatic Pixel" }).click();
  await expect(
    page.getByRole("searchbox", { name: "Bound query" }),
  ).toHaveValue("Pixel");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
test("Angular worker/HTTP parity, invalid responses, cancellation and generations", async ({
  page,
}) => {
  await page.goto("/#features");
  const query = page.getByRole("searchbox", { name: "Search feature catalog" });
  await query.fill("phone");
  await expect(page.getByRole("status")).toHaveText("2 matches");
  const local = await page.locator("article").allTextContents();
  for (const source of ["worker", "http"]) {
    await page.getByLabel("Source", { exact: true }).selectOption(source);
    await expect(page.getByRole("status")).toHaveText("2 matches");
    await expect
      .poll(() => page.locator("article").allTextContents())
      .toEqual(local);
  }
  await page.getByLabel("Source", { exact: true }).selectOption("invalid-http");
  await expect(page.getByRole("status")).toContainText("Search failed");
  await page.getByLabel("Source", { exact: true }).selectOption("slow");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("status")).not.toContainText("Searching");
  await page.getByRole("button", { name: "Test stale response" }).click();
  await expect(page.locator("article")).toHaveCount(2);
  await expect(page.locator("article").first()).toContainText("Framework");
  await page.waitForTimeout(450);
  await expect(page.locator("article").first()).toContainText("Framework");
});
test("Angular mutations keep derived fuzzy/suggestion indexes fresh", async ({
  page,
}) => {
  await page.goto("/#features");
  const query = page.getByRole("searchbox", { name: "Search feature catalog" });
  await query.fill("added");
  await expect(page.getByRole("status")).toHaveText("0 matches");
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await expect(page.locator("article")).toContainText("Added phone");
  await page
    .getByRole("button", { name: "Update document", exact: true })
    .click();
  await query.fill("updated");
  await expect(page.locator("article")).toContainText("Updated phone");
  await page
    .getByRole("button", { name: "Remove document", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("0 matches");
  await page.getByRole("button", { name: "Clear index", exact: true }).click();
  await query.fill("phone");
  await expect(page.getByRole("status")).toHaveText("0 matches");
  await page.getByRole("button", { name: "Reset index", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("2 matches");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/angular-features.png",
    fullPage: true,
  });
});
