import { chromium } from "playwright";
import { db } from "../db.ts";
import { getProductInfo } from "./getProductInfo.ts";

const CONCURRENCY = 3;

export const scrapeAllProducts = async () => {
  const productRows: { url: string }[] = db
    .prepare("SELECT url FROM product_links WHERE scraped = 0")
    .all();

  if (!productRows.length) return [];

  const queue = [...productRows];
  const results: any[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "lv-LV",
    timezoneId: "Europe/Riga",
  });

  const insertProduct = db.prepare(
    `INSERT OR IGNORE INTO products (url, title, sku, image, description, prices, attributes, sizes, scraped_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
  );

  const markScraped = db.prepare(
    `UPDATE product_links SET scraped = 1 WHERE url = ?`,
  );

  const workers = Array.from({ length: CONCURRENCY }).map(async () => {
    while (queue.length > 0) {
      const row = queue.shift();
      if (!row) continue;

      const page = await context.newPage();
      try {
        await page.goto(row.url, { waitUntil: "networkidle" });

        const infos = await getProductInfo(page); // handles multiple sizes
        for (const info of infos) {
          insertProduct.run(
            info.url,
            info.title,
            info.sku,
            info.image,
            info.description,
            JSON.stringify(info.prices),
            JSON.stringify(info.attributes),
            JSON.stringify(info.sizes),
          );
          results.push(info);
        }

        markScraped.run(row.url);
      } catch (err) {
        console.error("Failed to scrape:", row.url, err);
      } finally {
        await page.close();
      }
    }
  });

  await Promise.all(workers);
  await browser.close();

  return results;
};
