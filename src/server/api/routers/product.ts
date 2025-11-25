import { and, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { chromium } from "playwright";
import { set, z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { product_alternate_skus, products } from "~/server/db/schema";
// import { db } from "~/server/services/db";
import { getProductAvailability } from "~/server/services/scrapers/getAvailability";
import type { ProductInfo } from "~/server/services/scrapers/getProductInfo";

export type ProductInfoFlat = Pick<
  ProductInfo,
  "sku" | "title" | "url" | "image"
> & {
  sizes?: string;
};

export const productRouter = createTRPCRouter({
  searchSuggestions: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const q = input.query.trim();
      if (!q) return [];

      return (await db
        .select({
          sku: products.sku,
          title: products.title,
          url: products.url,
          image: products.image,
          sizes: products.sizes,
        })
        .from(products)
        .leftJoin(
          product_alternate_skus,
          eq(products.sku, product_alternate_skus.product_sku),
        )
        .where(
          and(
            or(
              ilike(products.title, `%${q}%`),
              ilike(products.sku, `%${q}%`),
              ilike(product_alternate_skus.alt_sku, `%${q}%`),
            ),
            or(
              isNull(products.sizes),
              eq(products.sku, sql`${products.sizes}->0->>'sku'`),
            ),
          ),
        )
        .groupBy(products.sku)
        .limit(5)) as ProductInfo[];
    }),
  getProductBySku: publicProcedure
    .input(z.object({ sku: z.string() }))
    .query(async ({ input }) => {
      const product = await db
        .select({
          sku: products.sku,
          title: products.title,
          url: products.url,
          image: products.image,
          sizes: products.sizes,
          prices: products.prices,
          attributes: products.attributes,
        })
        .from(products)
        .leftJoin(
          product_alternate_skus,
          eq(product_alternate_skus.product_sku, products.sku),
        )
        .where(
          or(
            eq(products.sku, input.sku),
            eq(product_alternate_skus.alt_sku, input.sku),
          ),
        )
        .limit(1);

      return (product[0] as ProductInfo) || null;
    }),
  getProductAvailability: publicProcedure
    .input(z.object({ link: z.string(), size: z.string().optional() }))
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
      if (input.size) await p.waitForLoadState("networkidle");
      const availability = await getProductAvailability(p, input.size);
      await p.close();
      await browser.close();

      return availability;
    }),
});
