#!/usr/bin/env ts-node

import { scrapeAllProducts } from "../server/services/scrapers/scrapeProducts.ts";

(async () => {
  try {
    const results = await scrapeAllProducts();
    console.log(`Scraped ${results.length} products.`);
  } catch (err) {
    console.error("Error scraping products:", err);
  } finally {
    process.exit(0);
  }
})();
