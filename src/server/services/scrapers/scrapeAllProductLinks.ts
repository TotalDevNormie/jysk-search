import { chromium } from "playwright";
import { getSubcategorieLinks } from "./getSubcategorieLinks.ts";
import { getProductLinks } from "./getProductLinks.ts";
import { db } from "../db.ts";

const CONCURRENCY = 3;
const MAX_RETRIES = 3;

export default async (categoryLinks: string[]) => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "lv-LV",
    timezoneId: "Europe/Riga",
  });

  const page = await context.newPage();

  // Insert categories into DB if not exist
  const insertCategory = db.prepare(
    `INSERT OR IGNORE INTO categories (url) VALUES (?)`,
  );
  categoryLinks.forEach((url) => insertCategory.run(url));

  const failedCategories: string[] = [];

  // Function to scrape one category
  const scrapeCategory = async (categoryUrl: string) => {
    try {
      const p = await context.newPage();
      const subcategories = await getSubcategorieLinks(categoryUrl, p);
      await p.close();
      return subcategories;
    } catch (err) {
      console.error(`Failed category: ${categoryUrl}`, err);
      failedCategories.push(categoryUrl);
      return [];
    }
  };

  // Scrape all categories
  const subcategoriesNested = await Promise.all(
    categoryLinks.map(scrapeCategory),
  );

  const allSubcategories = subcategoriesNested.flat();

  // Save categories status
  const updateCategoryStatus = db.prepare(
    `UPDATE categories SET status = ?, last_attempt = CURRENT_TIMESTAMP, attempts = attempts + 1 WHERE url = ?`,
  );
  categoryLinks.forEach((url) =>
    updateCategoryStatus.run(
      failedCategories.includes(url) ? "failed" : "done",
      url,
    ),
  );

  // Fetch product links with concurrency
  const queue = [...allSubcategories];
  const results: string[] = [];

  const insertProduct = db.prepare(
    `INSERT OR IGNORE INTO product_links (url, category_url, scraped_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
  );

  const workers = Array.from({ length: CONCURRENCY }).map(async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) continue;

      try {
        const p = await context.newPage();
        const links = await getProductLinks(p, url);
        links.forEach((link) => insertProduct.run(link, url));
        results.push(...links);
        await p.close();
      } catch (err) {
        console.error(`Failed product page: ${url}`, err);
      }
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

  return results;
};
