import type { Page } from "playwright";
import { safeAttr } from "./safeAttr";

export type ProductAvailability = {
  stores: StoreAvailability[];
  prices: {
    specialPrice?: string;
    regularPrice?: string;
    loyaltyPrice?: string;
    oldPrice?: string;
  };
};

export type StoreAvailability = {
  city: string;
  address: string;
  stock: string;
  sampleAvailable: boolean;
};

export const getProductAvailability = async (
  page: Page,
  size?: string,
): Promise<ProductAvailability> => {
  // Super-fast size select (no overhead)
  const select = page.locator(
    "#product-options-wrapper select.super-attribute-select",
  );

  if (size && (await select.count()) > 0) {
    await select.selectOption(size);
  }

  // Wait for table to appear (does NOT require visibility)
  await page
    .locator("table.availability-table tbody")
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle");

  // Everything extracted in ONE evaluation — fastest method Playwright supports
  const [specialPrice, regularPrice, loyaltyPrice, oldPrice] =
    await Promise.all([
      safeAttr(
        page,
        ".product-info-main .special-price .price-wo-currency",
        "data-value",
      ),
      safeAttr(
        page,
        ".product-info-main .price-box:not(:has(.special-price)) .price-wo-currency",
        "data-value",
      ),
      page
        .locator(".product-info-main .loyalty-price .price-wo-currency")
        .textContent(),
      safeAttr(
        page,
        ".product-info-main .old-price .price-wo-currency",
        "data-value",
      ),
    ]);

  const availability = await page.evaluate(() => {
    const rows = document.querySelectorAll(
      "table.availability-table:not([style*='display: none']) tbody tr",
    );

    const data: StoreAvailability[] = [];
    let currentCity: string | null = null;

    for (const row of rows) {
      const cityCell = row.querySelector(".col.city");
      if (cityCell && cityCell.textContent?.trim()) {
        currentCity = cityCell.textContent.trim();
      }

      const address =
        row.querySelector(".col.address a")?.textContent?.trim() || "";

      const stock =
        row
          .querySelector(
            ".col.item-count .almost-depleted-stock, .col.item-count .full-stock",
          )
          ?.textContent?.trim() || "";

      const sampleAvailable =
        row.querySelector(".col.item-count .sample-is-available") !== null;

      data.push({
        city: currentCity || "",
        address,
        stock,
        sampleAvailable,
      });
    }

    return data;
  });

  return {
    prices: {
      specialPrice,
      regularPrice,
      loyaltyPrice: loyaltyPrice ? loyaltyPrice.trim() : undefined,
      oldPrice,
    },
    stores: availability,
  };
};
