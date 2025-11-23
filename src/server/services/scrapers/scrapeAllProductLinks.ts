import { chromium } from "playwright";
import { getSubcategorieLinks } from "./getSubcategorieLinks.ts";
import { getProductLinks } from "./getProductLinks.ts";
import { db } from "../db.ts";

const CONCURRENCY = 1;
const MAX_RETRIES = 3;

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

  // Insert categories into DB if not exist
  const insertCategory = db.prepare(
    `INSERT OR IGNORE INTO categories (url) VALUES (?)`,
  );
  categoryLinks.forEach((url) => insertCategory.run(url));

  const failedCategories: string[] = [];
  let totalSubcategories = 0;
  let totalProductLinks = 0;

  // Scrape one category
  const scrapeCategory = async (categoryUrl: string) => {
    const p = await context.newPage();
    try {
      const subcategories = await getSubcategorieLinks(categoryUrl, p);
      totalSubcategories += subcategories.length;

      await p.close();
      // Live log
      console.clear();
      console.log(`Last scraped category: ${categoryUrl}`);
      console.log(`Total subcategories fetched: ${totalSubcategories}`);
      console.log(`Total product links saved: ${totalProductLinks}`);
      console.log(`Failed categories so far: ${failedCategories.length}`);

      return subcategories;
    } catch (err) {
      await p.close();

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

  // Update categories status
  const updateCategoryStatus = db.prepare(
    `UPDATE categories
     SET status = ?, last_attempt = CURRENT_TIMESTAMP, attempts = attempts + 1
     WHERE url = ?`,
  );
  categoryLinks.forEach((url) =>
    updateCategoryStatus.run(
      failedCategories.includes(url) ? "failed" : "done",
      url,
    ),
  );
  await browser.close();

  // Fetch product links concurrently
  const queue = [...allSubcategories];
  const results: string[] = [];

  const insertProduct = db.prepare(
    `INSERT OR IGNORE INTO product_links (url, category_url, scraped_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
  );

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
      console.log(url);
      const p = await context.newPage();

      try {
        const links = await getProductLinks(p, url);

        links.forEach((link) => {
          insertProduct.run(link, url);
          totalProductLinks++;
        });
        results.push(...links);

        // Live console update
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
      await p.close();
    }
  });

  await Promise.all(workers);
  await browser.close();

  // Retry failed categories up to MAX_RETRIES
  const retryCategories = failedCategories.filter((url) => {
    const row = db
      .prepare(`SELECT attempts FROM categories WHERE url = ?`)
      .get(url);
    return row.attempts < MAX_RETRIES;
  });

  if (retryCategories.length > 0) {
    console.log("Retrying failed categories:", retryCategories);
    const retryResults = await exports.default(retryCategories);
    results.push(...retryResults);
  }

  // const page = await context.newPage();
  //
  // const productLinks = await getProductLinks(page, "https://www.jysk.lv/aizkari/aizkari.html");
  // console.log(productLinks);
  // await page.close();
  return results;
};
