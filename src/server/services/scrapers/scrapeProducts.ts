import { chromium } from "playwright";
import { getProductInfo } from "./getProductInfo.ts";
import { eq, sql, and, notExists } from "drizzle-orm";
import { db } from "~/server/db/index.ts";
import {
  product_alternate_skus,
  product_links,
  products,
} from "~/server/db/schema.ts";

const CONCURRENCY = 3;

export const scrapeAllProducts = async () => {
  const productRows = await db
    .select({ url: product_links.url })
    .from(product_links)
    .where(
      notExists(
        db
          .select({ url: products.url })
          .from(products)
          .where(eq(products.url, product_links.url)),
      ),
    );

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

  const workers = Array.from({ length: CONCURRENCY }).map(async () => {
    while (queue.length > 0) {
      const row = queue.shift();
      if (!row) continue;

      const page = await context.newPage();

      try {
        await page.goto(row.url, { waitUntil: "networkidle" });

        const infos = await getProductInfo(page);
        for (const info of infos) {
          // UPSERT product
          await db
            .insert(products)
            .values({
              sku: info.sku,
              url: info.url,
              title: info.title,
              image: info.image,
              description: info.description,
              prices: info.prices,
              attributes: info.attributes,
              sizes: info.sizes,
              scrapedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: products.sku,
              set: {
                url: info.url,
                title: info.title,
                image: info.image,
                description: info.description,
                prices: info.prices,
                attributes: info.attributes,
                sizes: info.sizes,
                scrapedAt: new Date(),
              },
            });

          // Extract alternate SKUs from attributes.SKU
          const skuAttr = info?.attributes?.find(
            (a) => a.label.toLowerCase() === "sku",
          )?.data;

          if (skuAttr) {
            const altSkus = skuAttr
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s && s !== info.sku);

            for (const alt of altSkus) {
              await db
                .insert(product_alternate_skus)
                .values({
                  product_sku: info.sku,
                  alt_sku: alt,
                })
                .onConflictDoNothing();
            }
          }

          results.push(info);

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
