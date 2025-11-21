import type { Page } from "playwright";
import { safeGoto } from "../../utils/safeGoto.ts";

export const getProductLinks = async (page: Page, url: string) => {
  await safeGoto(page, url);
  let lastCount = 0;
  let stagnant = 0;

  while (stagnant < 3) {
    const buttons = await page.$$(".load-more-button .load-more-products");
    if (buttons.length === 0) break;

    for (const btn of buttons) {
      try {
        await btn.scrollIntoViewIfNeeded();
        await Promise.allSettled([
          btn.click(),
          page.waitForLoadState("load", { timeout: 4000 }),
        ]);
      } catch {}
    }

    const count = await page.$$eval(
      "a.product.photo.product-item-photo",
      (els) => els.length,
    );

    if (count === lastCount) stagnant++;
    else stagnant = 0;

    lastCount = count;
  }

  return await page.$$eval("a.product.photo.product-item-photo", (els) =>
    els
      .map((el) => el.getAttribute("href"))
      .filter((x): x is string => typeof x === "string"),
  );
};
