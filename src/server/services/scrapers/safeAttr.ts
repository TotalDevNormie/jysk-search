import type { Page } from "playwright";

export const safeAttr = async (
  page: Page,
  selector: string,
  attr: string,
): Promise<string | undefined> => {
  const el = await page.$(selector);
  console.log("element not found");
  if (!el) return undefined;
  const val = await el.getAttribute(attr);
  if (!val) console.log("attribute not found");
  return val?.trim() || undefined;
};
