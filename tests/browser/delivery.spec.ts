import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Angular examples navigate and refresh with working assets and endpoints", async ({
  page,
  request,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("/#minimal");
  await page.getByRole("link", { name: "10,000-product catalog" }).click();
  await expect(page.locator("article")).toHaveCount(24);
  await page.reload();
  await expect(page.getByRole("status")).toContainText("10,000 products");
  await page.getByRole("link", { name: /Feature lab/ }).click();
  await expect(
    page.getByRole("heading", { name: "Search, inspect, integrate." }),
  ).toBeVisible();
  await page.reload();
  const input = page.getByRole("searchbox", { name: "Search feature catalog" });
  await page.getByLabel("Source", { exact: true }).selectOption("worker");
  await input.fill("phone");
  await expect(page.getByRole("status")).toHaveText("2 matches");
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/search")),
    page.getByLabel("Source", { exact: true }).selectOption("http"),
  ]);
  await expect(page.getByRole("status")).toHaveText("2 matches");
  await expect(
    page.getByRole("link", { name: "Documentation", exact: true }),
  ).toHaveAttribute("href", "https://searchivo.netlify.app/docs/");
  await page.goto(
    (process.env["SEARCHIVO_DOCS_URL"] ?? "http://127.0.0.1:4184") + "/docs/",
  );
  await expect(
    page.getByRole("heading", { name: "Build search with confidence." }),
  ).toBeVisible();
  const response = await request.post("/api/search", {
    data: { query: "phone" },
  });
  expect(response.ok()).toBe(true);
  expect((await response.json()).total).toBe(2);
  expect(failures).toEqual([]);
});

test("documentation searches the entire library and exposes integration references", async ({
  page,
}) => {
  const docsOrigin =
    process.env["SEARCHIVO_DOCS_URL"] ?? "http://127.0.0.1:4184";
  await page.goto(docsOrigin + "/docs/");
  await page
    .getByRole("searchbox", { name: "Find in the guide" })
    .fill("maxVisitedNodes");
  await expect(page.locator("#topic-reference-core")).toBeVisible();
  await page
    .getByRole("link", { name: "Read Engine, ranking and highlights" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Core API reference", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Copy code", exact: true }),
  ).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto(docsOrigin + "/api/");
  for (const name of [
    "@searchivo/angular",
    "@searchivo/workers/client",
    "@searchivo/adapters",
    "@searchivo/devtools",
    "@searchivo/themes/css",
  ])
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
});
