import { chromium } from "playwright";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/services/db";
import { getProductAvailability } from "~/server/services/scrapers/getAvailability";

export const productRouter = createTRPCRouter({
  searchSuggestions: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const q = input.query.trim();
      if (!q) return [];

      const stmt = db.prepare(`
SELECT p.sku, p.title, p.url, p.image 
FROM products p 
LEFT JOIN product_alternate_skus a 
  ON p.sku = a.product_sku 
WHERE p.title LIKE ? 
  OR p.sku LIKE ? 
  OR a.alt_sku LIKE ? 
GROUP BY p.sku 
LIMIT 10
  `);

      const results = stmt.all(`%${q}%`, `%${q}%`, `%${q}%`);

      return results.map((p) => ({
        id: p.id,
        title: p.title,
        sku: p.sku,
        url: p.url,
        image: p.image,
      }));
    }),
  getProductBySku: publicProcedure
    .input(z.object({ sku: z.string() }))
    .query(async ({ input }) => {
      //       const stmt = db.prepare(`
      //         SELECT p.sku, p.title, p.url, p.image, p.description, p.prices, p.attributes, p.sizes
      //
      // FROM products p
      // LEFT JOIN product_alternate_skus a
      //   ON p.sku = a.product_sku
      //         WHERE p.sku = ?
      // OR a.alt_sku = ?
      //       `);

      const stmt = db.prepare(`
      SELECT p.*
      FROM products p
      LEFT JOIN product_alternate_skus a
        ON p.sku = a.product_sku
      WHERE p.sku = ?
        OR a.alt_sku = ?
      GROUP BY p.sku
        `);

      //       const stmt = db.prepare(`
      // SELECT '112710' = 112710;
      // `);

      console.log(input.sku);

      const results = stmt.get(input.sku, input.sku);
      // const results = stmt.get();

      return results;
    }),
  getProductAvailability: publicProcedure
    .input(z.object({ link: z.string() }))
    .query(async ({ input }) => {
      let browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
        ],
      });

      let context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale: "lv-LV",
        timezoneId: "Europe/Riga",
      });

      const p = await context.newPage();
      await p.goto(input.link);
      const availability = await getProductAvailability(p);
      await p.close();
      await browser.close();

      return availability;
    }),
});
