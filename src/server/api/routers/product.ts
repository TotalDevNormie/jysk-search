import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { product_alternate_skus, products } from "~/server/db/schema";
import type { ProductInfo } from "~/server/services/scrapers/getProductInfo";

function escapeForRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isInt(str: string): boolean {
  const num = Number(str);
  console.log("isInt", num);
  return Number.isInteger(num);
}

function buildSearchConditions(words: string[]) {
  return words.map((w) => {
    const escaped = escapeForRegex(w);
    const regex = `.*${escaped}.*`; // matches like %w% (substring)

    return or(
      ilike(sql`unaccent(${products.title})`, `%${w}%`),
      ilike(sql`unaccent(${products.sku})`, `%${w}%`),
      ilike(sql`unaccent(${product_alternate_skus.alt_sku})`, `%${w}%`),
      ilike(sql`unaccent(${products.description})`, `%${w}%`),
      sql`
        jsonb_path_exists(
          ${products.attributes},
          ${`$[*] ? (@.data like_regex "${regex}" flag "i")`}
        )
      `,
    );
  });
}


export const productRouter = createTRPCRouter({
  searchSuggestions: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      try {
        const q = input.query.trim();
        if (!q) return [];

        const words = q.split(/\s+/).filter(Boolean);

        const last = words[words.length - 1];

        if (words.length >= 2 && last && /\d+/.test(last as string)) {
          return (await db
            .select({
              sku: products.sku,
              title: products.title,
              url: products.url,
              image: products.image,
              sizes: products.sizes,
            })
            .from(products)
            .where(
              and(
                ilike(sql`unaccent(${products.title})`, `%${words[0]}%`),
                sql`EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(${products.attributes}) AS elem
                  WHERE elem->>'data' ILIKE ${`%${last}%`}
                )`,
              ),
            )
            .groupBy(products.sku)
            .limit(10)) as ProductInfo[];
        }

        const conditions = buildSearchConditions(words);

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
              ...conditions,
              words.length === 1 && words[0] && isInt(words[0])
                ? undefined
                : or(
                    isNull(products.sizes),
                    eq(products.sku, sql`${products.sizes}->0->>'sku'`),
                  ),
            ),
          )
          .groupBy(products.sku)
          .limit(5)) as ProductInfo[];
      } catch {
        return [];
      }
    }),

  searchResult: publicProcedure
    .input(
      z.object({
        query: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(12),
      }),
    )
    .query(async ({ input }) => {
      try {
        const q = input.query.trim();
        if (!q) return { products: [], total: 0 };

        const words = q.split(/\s+/).filter(Boolean);
        const conditions = buildSearchConditions(words);

        const offset = (input.page - 1) * input.limit;

        const [countResult] = await db
          .select({ count: sql<number>`count(DISTINCT ${products.sku})` })
          .from(products)
          .leftJoin(
            product_alternate_skus,
            eq(products.sku, product_alternate_skus.product_sku),
          )
          .where(and(...conditions));

        const total = countResult?.count ?? 0;

        const results = (await db
          .selectDistinct({
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
          .where(and(...conditions))
          .orderBy(products.title)
          .limit(input.limit)
          .offset(offset)) as ProductInfo[];

        return { products: results, total };
      } catch (err) {
        console.error(err);
        return { products: [], total: 0 };
      }
    }),

  getProductBySku: publicProcedure
    .input(z.object({ sku: z.string() }))
    .query(async ({ input }) => {
    try {
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
      } catch (err) {
        console.error(err);
        return null;
      }
    }),

  test: publicProcedure.query(async () => "test"),
});
