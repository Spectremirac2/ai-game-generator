import { expect, test } from "@playwright/test";

test.describe("Game Generation", () => {
  test("should generate game from prompt", async ({ page }) => {
    await page.goto("/");

    await page.click('button:has-text("Platformer")');

    await page.fill("textarea", "A fun jumping game");

    await page.click('button:has-text("Generate Game")');

    await page.waitForSelector("iframe", { timeout: 30_000 });

    const iframe = page.frameLocator("iframe");
    await expect(iframe.locator("canvas")).toBeVisible();
  });
});
