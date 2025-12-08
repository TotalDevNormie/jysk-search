import type { Page } from "playwright";

export type ProductAvailability = {
  stores: StoreAvailability[];
  cupon: string;
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
  const stores = await getAvailability(page, size);
  return {
    stores,
    cupon: "",
  };
};

export const getAvailability = async (
  page: Page,
  size?: string,
): Promise<StoreAvailability[]> => {
  
  // Super-fast size select (no overhead)
  const select = page.locator(
    "#product-options-wrapper select.super-attribute-select"
  );

  if (size && (await select.count() > 0)) {
    await select.selectOption(size);
  }

  // Wait for table to appear (does NOT require visibility)
  await page.locator("table.availability-table tbody").waitFor({ timeout: 5000 }).catch(() => {});

  // Everything extracted in ONE evaluation — fastest method Playwright supports
  return await page.evaluate(() => {
    const rows = document.querySelectorAll(
      "table.availability-table:not([style*='display: none']) tbody tr"
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
            ".col.item-count .almost-depleted-stock, .col.item-count .full-stock"
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
};
