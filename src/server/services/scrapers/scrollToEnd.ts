import type { Page } from "playwright";

/**
 * Scrolls the page until no more content is loaded.
 * @param page Playwright page instance
 * @param scrollStep How much to scroll each time (in pixels)
 * @param waitMs Optional fallback wait after each scroll
 */
export const scrollToEnd = async (
  page: Page,
  scrollStep = 1000,
  waitMs = 500,
) => {
  let previousHeight = 0;

  while (true) {
    // Scroll down by scrollStep
    await page.evaluate((step) => window.scrollBy(0, step), scrollStep);

    // Wait for network to finish any lazy loading triggered by scroll
    await page.waitForLoadState("networkidle");

    // Optional small timeout in case networkidle doesn't capture everything
    await page.waitForTimeout(waitMs);

    // Check current scroll height
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    // Stop if we have reached the bottom
    if (currentHeight === previousHeight) break;

    previousHeight = currentHeight;
  }
};
