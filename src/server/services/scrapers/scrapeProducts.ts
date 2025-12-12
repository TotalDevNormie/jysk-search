import "dotenv/config";
import { chromium } from "playwright";
import { getProductInfo } from "./getProductInfo.ts";
import { eq, lt, notExists, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import {
  product_alternate_skus,
  product_links,
  products,
} from "../../db/schema.ts";

const CONCURRENCY = 6;

export const scrapeAllProducts = async (): Promise<{
  results: any[];
  failures: string[];
}> => {
  const FOUR_DAYS_AGO = sql`NOW() - INTERVAL '4 days'`;

  const productRows = await db
    .select()
    .from(product_links)
    .where(
      notExists(
        db.select().from(products).where(eq(products.url, product_links.url)),
      ),
    );

  if (!productRows.length) return { results: [], failures: [] };

  const queue = [...productRows];
  const results: any[] = [];
  const failures: string[] = [];

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
        if (row?.url === null) continue;
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
              scraped_at: new Date(),
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
                scraped_at: new Date(),
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
          console.log(`Last scraped: ${info.title} - ${info.sku}`);
          console.log(`Products scraped: ${results.length}`);
          console.log(`Failed scrapes: ${failures}`);
        }
      } catch (err) {
        failures.push(row.url as string);

        console.clear();
        console.log(`Failed to scrape: ${row.url}`);
        console.log(`Products scraped: ${results.length}`);
        console.log(`Failed scrapes: ${failures.length}`);
      } finally {
        await page.close();
      }
    }
  });

  await Promise.all(workers);
  await browser.close();

  return { results, failures };
};
