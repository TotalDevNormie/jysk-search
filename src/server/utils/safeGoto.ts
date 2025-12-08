import type { Page } from "playwright";

export const safeGoto = async (page: Page, url: string) => {
  let lastError: unknown = null;

  for (let i = 0; i < 3; i++) {
    try {
      return await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
    } catch (e) {
      lastError = e;

      // only retry if page is still open
      if (page.isClosed()) break;
    }
  }

  // final fail
  if (!page.isClosed()) await page.close();
  throw lastError;
};
