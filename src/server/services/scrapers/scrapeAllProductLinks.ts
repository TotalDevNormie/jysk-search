import "dotenv/config";
import { chromium } from "playwright";
import { getSubcategorieLinks } from "./getSubcategorieLinks.ts";
import { getProductLinks } from "./getProductLinks.ts";
import { eq, sql } from "drizzle-orm";
import { categories, product_links } from "../../db/schema.ts";
import { db } from "../../db/index.ts";

const CONCURRENCY = 1;
const MAX_RETRIES = 3;

console.log(process.env.DATABASE_URL);

export default async (categoryLinks: string[]): Promise<string[]> => {
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

  const failedCategories: string[] = [];
  let totalSubcategories = 0;
  let totalProductLinks = 0;

  // Scrape one category
  const scrapeCategory = async (categoryUrl: string) => {
    const page = await context.newPage();
    try {
      const subcategories = await getSubcategorieLinks(categoryUrl, page);
      totalSubcategories += subcategories.length;
      await page.close();

      // Insert subcategories into DB
      if (subcategories.length > 0) {
        await db
          .insert(categories)
          .values(subcategories.map((url) => ({ url })))
          .onConflictDoNothing();
      }

      console.clear();
      console.log(`Last scraped category: ${categoryUrl}`);
      console.log(`Total subcategories fetched: ${totalSubcategories}`);
      console.log(`Total product links saved: ${totalProductLinks}`);
      console.log(`Failed categories so far: ${failedCategories.length}`);

      return subcategories;
    } catch (err) {
      await page.close();
      failedCategories.push(categoryUrl);

      console.clear();
      console.log(`Failed category: ${categoryUrl}`);
      console.log(`Total subcategories fetched: ${totalSubcategories}`);
      console.log(`Total product links saved: ${totalProductLinks}`);
      console.log(`Failed categories so far: ${failedCategories.length}`);

      return [];
    }
  };

  const subcategoriesNested = await Promise.all(
    categoryLinks.map(scrapeCategory),
  );
  const allSubcategories = subcategoriesNested.flat();

  // Update category status
  for (const url of categoryLinks) {
    await db
      .update(categories)
      .set({
        status: failedCategories.includes(url) ? "failed" : "done",
        last_attempt: new Date(),
        attempts: sql`${categories.attempts} + 1`,
      })
      .where(eq(categories.url, url));
  }

  await browser.close();

  // Fetch product links concurrently
  const queue = [...allSubcategories];
  const results: string[] = [];

  browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "lv-LV",
    timezoneId: "Europe/Riga",
  });

  const workers = Array.from({ length: CONCURRENCY }).map(async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) continue;
      const page = await context.newPage();

      try {
        const links = await getProductLinks(page, url);

        for (const link of links) {
          await db
            .insert(product_links)
            .values({ url: link, category_url: url })
            .onConflictDoNothing();
          totalProductLinks++;
        }

        results.push(...links);

        console.clear();
        console.log(`Last scraped product page: ${url}`);
        console.log(`Total subcategories fetched: ${totalSubcategories}`);
        console.log(`Total product links saved: ${totalProductLinks}`);
        console.log(`Failed categories so far: ${failedCategories.length}`);
      } catch (err) {
        console.clear();
        console.log(`Failed product page: ${url}`);
        console.log(err);
      }
      await page.close();
    }
  });

  await Promise.all(workers);
  await browser.close();

  // Retry failed categories up to MAX_RETRIES
  const retryCategories: string[] = [];
  for (const url of failedCategories) {
    const row = await db
      .select({ attempts: categories.attempts })
      .from(categories)
      .where(eq(categories.url, url))
      .limit(1);

    if (row[0]?.attempts && row[0]?.attempts < MAX_RETRIES)
      retryCategories.push(url);
  }

  if (retryCategories.length > 0) {
    console.log("Retrying failed categories:", retryCategories);
    const retryResults = await exports.default(retryCategories);
    results.push(...retryResults);
  }

  return results;
};
