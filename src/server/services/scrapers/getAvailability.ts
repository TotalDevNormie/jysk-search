import type { Page } from "playwright";
import { safeAttr } from "./safeAttr.ts";

export type ProductAvailability = {
  stores: StoreAvailability[];
  cupon: string;
};

type StoreAvailability = {
  city: string;
  address: string;
  stock: string;
  sampleAvailable: boolean;
};

export const getProductAvailability = async (
  page: Page,
  size?: string
): Promise<ProductAvailability> => {
  const [stores, cuponLink] = await Promise.all([
    getAvailability(page, size),
    safeAttr(page, ".promo-strip a", "href"),
  ]);

  return {
    stores,
    cupon: cuponLink?.split("/").filter(Boolean).pop() || "",
  };
};

export const getAvailability = async (
  page: Page,
  size?: string,
): Promise<StoreAvailability[]> => {
  const select = await page.$(
    "#product-options-wrapper select.super-attribute-select",
  );
  if (select && size) {
    console.log("select", size);
    await select.selectOption(size);
  }

  return await page.$$eval(
    "table.availability-table:not([style*='display: none']) tbody tr",
    (rows) => {
      const data: StoreAvailability[] = [];

      let currentCity: string | null = null;

      rows.forEach((row) => {
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
      });

      return data;
    },
  );
};
