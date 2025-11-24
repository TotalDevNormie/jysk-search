import type { Page } from "playwright";
import { safeAttr } from "./safeAttr.ts";
import { safeText } from "./safeText.ts";

export type ProductInfo = {
  title: string;
  url: string;
  sku: string;
  prices: {
    specialPrice?: string;
    regularPrice?: string;
    loyaltyPrice?: string;
    oldPrice?: string;
  };
  image: string;
  attributes: Array<{ label: string; data: string }>;
  sizes?: Array<{ size: string; sku: string }>;
  description?: string;
};

export const getProductInfo = async (page: Page): Promise<ProductInfo[]> => {
  const select = await page.$(
    "#product-options-wrapper select.super-attribute-select",
  );

  if (!select) {
    const info = await scrapeProductInfo(page);
    return [
      {
        ...info,
        sizes: [{ size: "Default", sku: info.sku }],
      },
    ];
  }

  const options = await select.$$eval("option", (els) =>
    els
      .map((el) => ({
        value: (el as HTMLOptionElement).value,
        label: el.textContent?.trim() || "",
      }))
      .filter((o) => o.value),
  );

  const scraped: Array<{
    info: ProductInfo;
    size: { size: string; sku: string };
  }> = [];

  for (const opt of options) {
    await select.selectOption(opt.value);
    await page.waitForLoadState("networkidle");

    const info = await scrapeProductInfo(page);

    scraped.push({
      info,
      size: { size: opt.label, sku: info.sku },
    });
  }

  const allSizes = scraped.map((s) => s.size);

  return scraped.map((s) => ({
    ...s.info,
    sizes: allSizes, // everyone gets the full list
  }));
};

const scrapeProductInfo = async (page: Page): Promise<ProductInfo> => {
  const [
    title,
    sku,
    description,
    image,
    specialPrice,
    regularPrice,
    loyaltyPrice,
    oldPrice,
    attributes,
    url,
  ] = await Promise.all([
    page.textContent("h1.page-title"),
    page.textContent("div.product.attribute.sku div.value"),
    safeText(page, ".sales-text-data-wrapper td.col.data"),
    safeAttr(page, "#mtImageContainer img", "src"),

    safeAttr(
      page,
      ".product-info-main .special-price span.price-wo-currency",
      "data-value",
    ),
    safeAttr(
      page,
      ".product-info-main .price-box:not(:has(.special-price)) span.price-wo-currency",
      "data-value",
    ),
    safeAttr(
      page,
      ".product-info-main .loyalty-price span.price-wo-currency",
      "data-value",
    ),
    safeAttr(
      page,
      ".product-info-main .old-price span.price-wo-currency",
      "data-value",
    ),

    page.$$eval(".attributes-wrapper", (wrappers) => {
      const visible = wrappers.find(
        (w) => w instanceof HTMLElement && w.offsetParent !== null,
      );
      if (!visible) return [];

      return [...visible.querySelectorAll(".attribute")].map((n) => ({
        label: n.querySelector(".col.label")?.textContent?.trim() || "",
        data: n.querySelector(".col.data")?.textContent?.trim() || "",
      }));
    }),
    page.url(),
  ]);

  return {
    title: title?.trim() || "",
    sku: sku || "",
    image: image || "",
    description: description || "",
    prices: {
      specialPrice,
      regularPrice,
      loyaltyPrice,
      oldPrice,
    },
    attributes: attributes || [],
    url,
  };
};
