import type { Page } from "playwright";

export const safeAttr = async (
  page: Page,
  selector: string,
  attr: string,
): Promise<string | undefined> => {
  const el = await page.$(selector);
  if (!el) return undefined;
  const val = await el.getAttribute(attr);
  return val?.trim() || undefined;
};
