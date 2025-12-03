#!/usr/bin/env ts-node

import { scrapeAllProducts } from "../server/services/scrapers/scrapeProducts.ts";

(async () => {
  try {
    const data = await scrapeAllProducts();
    console.log(`Scraped ${data.results.length} products.`);
    console.log("Failures:");
    for (const url of data.failures) {
      console.log(`${url}`);
    }
  } catch (err) {
    console.error("Error scraping products:", err);
  } finally {
    process.exit(0);
  }
})();
