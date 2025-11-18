import type { Page } from "playwright";

export const safeGoto = async (page: Page, url: string) => {
  for (let i = 0; i < 3; i++) {
    try {
      return await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (e) {
      if (i === 2) throw e;
    }
  }
};
