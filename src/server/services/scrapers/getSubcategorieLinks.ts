import type { Page } from "playwright";
import { safeGoto } from "../../utils/safeGoto.ts";

export const getSubcategorieLinks = async (
  categoryLink: string,
  page: Page,
) => {
  try {
    await safeGoto(page, categoryLink);
    await page.waitForTimeout(1000);
  } catch (error) {
    console.error(`Failed to navigate to ${categoryLink} :`, error);
    return [];
  }

  return await page.$$eval("a.category-block-link", (els) =>
    els
      .map((el) => el.getAttribute("href"))
      .filter((href): href is string => typeof href === "string"),
  );
};
