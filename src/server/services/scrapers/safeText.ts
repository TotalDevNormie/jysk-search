import type { Page } from "playwright";

export const safeText = async(
  page: Page,
  selector: string
): Promise<string | undefined> => {
  const el = await page.$(selector);
  if (!el) return undefined;
  const text = await el.textContent();
  return text?.trim() || undefined;
}
