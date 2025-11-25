import { chromium } from "playwright";
import { db } from "../db.ts";
import { getProductInfo } from "./getProductInfo.ts";

const CONCURRENCY = 3;

export const scrapeAllProducts = async () => {
  const productRows = db
    .prepare(
      `
    SELECT url 
    FROM product_links
    WHERE NOT EXISTS (
      SELECT 1 FROM products WHERE products.url = product_links.url
    )
  `,
    )
    .all() as { url: string }[];

  if (!productRows.length) return [];

  const queue = [...productRows];
  const results: any[] = [];
  let failures = 0;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "lv-LV",
    timezoneId: "Europe/Riga",
  });

  const insertProduct = db.prepare(`
    INSERT OR REPLACE INTO products 
      (sku, url, title, image, description, prices, attributes, sizes, scraped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const insertAltSku = db.prepare(`
    INSERT OR IGNORE INTO product_alternate_skus (product_sku, alt_sku)
    VALUES (?, ?)
  `);

  const workers = Array.from({ length: CONCURRENCY }).map(async () => {
    while (queue.length > 0) {
      const row = queue.shift();
      if (!row) continue;

      const page = await context.newPage();
      try {
        await page.goto(row.url, { waitUntil: "networkidle" });

        const infos = await getProductInfo(page);

        for (const info of infos) {
          insertProduct.run(
            info.sku,
            info.url,
            info.title,
            info.image,
            info.description,
            JSON.stringify(info.prices),
            JSON.stringify(info.attributes),
            JSON.stringify(info.sizes),
          );

          // Only parse alternate SKUs from attributes.SKU
          const skuAttr = info?.attributes?.find(
            (a) => a.label.toLowerCase() === "sku",
          )?.data;
          if (skuAttr) {
            const altSkus = skuAttr
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s && s !== info.sku);

            for (const alt of altSkus) {
              insertAltSku.run(info.sku, alt);
            }
          }

          results.push(info);

          // Pretty console log
          console.clear();
          console.log(`Last scraped: ${info.title}`);
          console.log(`Products scraped: ${results.length}`);
          console.log(`Failed scrapes: ${failures}`);
        }
      } catch (err) {
        failures++;
        console.clear();
        console.log(`Failed to scrape: ${row.url}`);
        console.log(`Products scraped: ${results.length}`);
        console.log(`Failed scrapes: ${failures}`);
      } finally {
        await page.close();
      }
    }
  });

  await Promise.all(workers);
  await browser.close();

  return results;
};
