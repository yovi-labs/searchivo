import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("actual module Worker indexes, queries and suggests using the package protocol", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const path = "/worker-demo.js";
    const module = (await import(/* @vite-ignore */ path)) as {
      runWorkerExample(): Promise<{
        results: { id: number }[];
        suggestions: string[];
      }>;
    };
    return module.runWorkerExample();
  });
  expect(result.results[0]?.id).toBe(1);
  expect(result.suggestions).toEqual(["phone"]);
});
test("native search works with keyboard and programmatic query synchronization", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("searchbox", { name: "Search products" });
  await input.fill("iphone");
  await expect(page.getByRole("listitem")).toHaveText("Apple iPhone");
  await expect(input).toBeFocused();
  await page.getByRole("button", { name: "Search Pixel" }).click();
  await expect(input).toHaveValue("Pixel");
  await expect(page.getByRole("listitem")).toHaveText("Google Pixel");
  await page.keyboard.press("Shift+Tab");
  await expect(input).toBeFocused();
});
test("real browser IME and accessibility", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("searchbox");
  await input.dispatchEvent("compositionstart");
  await input.fill("Galaxy");
  await expect(page.getByRole("status")).toHaveText("0 results");
  await input.dispatchEvent("compositionend");
  await expect(page.getByRole("status")).toHaveText("1 results");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
