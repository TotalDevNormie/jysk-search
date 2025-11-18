#!/usr/bin/env ts-node

import { db } from "../server/services/db.ts";

const productLinks = db
  .prepare("SELECT COUNT(*) AS c FROM product_links")
  .get().c;

const scrapedLinks = db
  .prepare("SELECT COUNT(*) AS c FROM product_links WHERE scraped = 1")
  .get().c;

const products = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;

console.log("Total product links:", productLinks);
console.log("Scraped links:", scrapedLinks);
console.log("Products:", products);

process.exit(0);
