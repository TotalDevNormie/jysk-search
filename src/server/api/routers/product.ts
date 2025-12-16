import { and, eq, ilike, isNull, or, SQL, sql } from "drizzle-orm";
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

const isSixDigit = (str: string) => /^\d{6}$/.test(str);

function buildSearchConditions(words: string[]) {
  return words.map((w) =>
    or(
      sql`
        EXISTS (
          SELECT 1
          FROM unnest(
            regexp_split_to_array(
              unaccent(${products.title}),
              '\\s+'
            )
          ) AS title_word
          WHERE similarity(
            title_word,
            unaccent(${w})
          ) > 0.25
        )
      `,

      sql`similarity(unaccent(${products.sku}), unaccent(${w})) > 0.25`,
      sql`similarity(unaccent(${product_alternate_skus.alt_sku}), unaccent(${w})) > 0.25`,
      sql`similarity(unaccent(${products.description}), unaccent(${w})) > 0.25`,

      sql`
        EXISTS (
          SELECT 1
          FROM jsonb_array_elements(${products.attributes}) AS attr
          WHERE similarity(
            unaccent(attr->>'data'),
            unaccent(${w})
          ) > 0.25
        )
      `,
    ),
  );
}

function buildTitleOrderBy(words: string[]) {
  return sql`
    (
      SELECT COALESCE(
        MAX(
          similarity(title_word, search_word)
        ),
        0
      )
      FROM unnest(
        regexp_split_to_array(
          unaccent(${products.title}),
          '\\s+'
        )
      ) AS title_word
      CROSS JOIN unnest(
        ARRAY[
          ${
            words.length
              ? sql.join(
                  words.map((w) => sql`unaccent(${w})`),
                  sql`, `,
                )
              : sql`NULL`
          }
        ]::text[]
      ) AS search_word
    ) DESC
  `;
}

function buildWordSplitSearch(words: string[]) {
  if (!words.length) return [];

  const last = words[words.length - 1];
  const initialWords = words.slice(0, -1);

  const conditions: SQL[] = [];

  if (initialWords.length > 0) {
    initialWords.forEach((w) => {
      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM unnest(
            regexp_split_to_array(unaccent(${products.title}), '\\s+')
          ) AS title_word
          WHERE similarity(title_word, unaccent(${w})) > 0.25
        )`,
      );
    });
  }

  if (last) {
    conditions.push(
      sql`EXISTS (
        SELECT 1
        FROM jsonb_array_elements(${products.attributes}) AS elem
        WHERE similarity(unaccent(elem->>'data'), unaccent(${last})) > 0.25
      )`,
    );
  }

  return conditions;
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

        if (words.length === 1 && isSixDigit(last as string)) {
          return (await db
            .select({
              sku: products.sku,
              title: products.title,
              url: products.url,
              image: products.image,
              sizes: products.sizes,
              prices: products.prices,
            })
            .from(products)
            .leftJoin(
              product_alternate_skus,
              eq(products.sku, product_alternate_skus.product_sku),
            )
            .where(
              or(
                eq(products.sku, last as string),
                eq(product_alternate_skus.alt_sku, last as string),
              ),
            )
            .groupBy(products.sku)) as ProductInfo[];
        }

        if (words.length >= 2 && last && /\d+/.test(last as string)) {
          return (await db
            .select({
              sku: products.sku,
              title: products.title,
              url: products.url,
              image: products.image,
              sizes: products.sizes,
              prices: products.prices,
            })
            .from(products)
            .where(and(...buildWordSplitSearch(words)))
            .groupBy(products.sku)
            .orderBy(buildTitleOrderBy(words))
            .limit(5)) as ProductInfo[];
        }

        const conditions = buildSearchConditions(words);

        return (await db
          .select({
            sku: products.sku,
            title: products.title,
            url: products.url,
            image: products.image,
            sizes: products.sizes,
            prices: products.prices,
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
          .orderBy(buildTitleOrderBy(words))
          .limit(5)) as ProductInfo[];
      } catch (err) {
        console.error(err);
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
          .select({
            sku: products.sku,
            title: products.title,
            url: products.url,
            image: products.image,
            sizes: products.sizes,
            prices: products.prices,
          })
          .from(products)
          .leftJoin(
            product_alternate_skus,
            eq(products.sku, product_alternate_skus.product_sku),
          )
          .where(and(...conditions))
          .groupBy(products.sku) // ← use GROUP BY instead of SELECT DISTINCT
          .orderBy(buildTitleOrderBy(words))
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
