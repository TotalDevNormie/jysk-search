import { and, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { product_alternate_skus, products } from "~/server/db/schema";
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
      try {
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
      } catch (err) {
        console.error(err);
        return [];
      }
    }),
  searchResult: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      try {
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
              or(
                ilike(products.title, `%${q}%`),
                ilike(products.sku, `%${q}%`),
                ilike(product_alternate_skus.alt_sku, `%${q}%`),
                ilike(products.description, `%${q}%`),
              )
          )) as ProductInfo[];
      } catch (err) {
        console.error(err);
        return [];
      }
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
  test: publicProcedure.query(async () => {
    console.log("test");
    return "test";
  }),
});
