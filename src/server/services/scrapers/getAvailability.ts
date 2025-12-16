import type { Page } from "playwright";

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
  const select = page.locator(
    "#product-options-wrapper select.super-attribute-select",
  );

  if (size && (await select.count()) > 0) {
    await select.selectOption(size);
  }

  await page
    .locator("table.availability-table tbody")
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  await page
    .locator("product-info-main")
    .waitFor({ timeout: 5000 })
    .catch(() => {});

  const result = await page.evaluate(() => {
    const getPriceValue = (
      selector: string,
      attribute: "data-value" | "textContent" = "data-value",
    ): string | undefined => {
      const element = document.querySelector(selector);
      console.log("element", element);
      if (!element) return undefined;

      console.log(
        attribute,
        attribute === "data-value"
          ? element.getAttribute("data-value") || undefined
          : element.textContent?.trim() || undefined,
      );

      return attribute === "data-value"
        ? element.getAttribute("data-value") || undefined
        : element.textContent?.trim() || undefined;
    };

    const specialPrice = getPriceValue(
      ".product-info-main .special-price .price-wo-currency",
    );
    const regularPrice = getPriceValue(
      ".product-info-main .price-box:not(:has(.special-price)) .price-wo-currency",
    );
    const loyaltyPrice = getPriceValue(
      ".product-info-main .loyalty-price .price-wo-currency",
      "textContent", // Using textContent as per original code
    );
    const oldPrice = getPriceValue(
      ".product-info-main .old-price .price-wo-currency",
    );

    // 2. Availability Extraction
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

      // Only push a row if a city/address is present to avoid empty entries
      if (currentCity || address) {
        data.push({
          city: currentCity || "",
          address,
          stock,
          sampleAvailable,
        });
      }
    }

    return {
      prices: {
        specialPrice,
        regularPrice,
        loyaltyPrice, // Already trimmed if found, or undefined
        oldPrice,
      },
      stores: data,
    };
  });

  // Return the result directly from the page.evaluate
  return result;
};

// You should now remove or not use the safeAttr function from your file.
// If your existing implementation relies on the ProductAvailability type
// and the price fields are defined as string | undefined, this will work perfectly.
