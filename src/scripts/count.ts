#!/usr/bin/env ts-node

import { db } from "../server/services/db.ts";

const rowProducts = db
  .prepare("SELECT COUNT(*) AS c FROM product_links")
  .get() as { c: number };

const productLinks = rowProducts.c;

const rowLinks = db
  .prepare("SELECT COUNT(*) AS c FROM product_links WHERE scraped = 1")
  .get() as { c: number };

const scrapedLinks = rowLinks.c;

const productsRow = db.prepare("SELECT COUNT(*) AS c FROM products").get() as {c: number};
const products = productsRow.c;

console.log("Total product links:", productLinks);
console.log("Scraped links:", scrapedLinks);
console.log("Products:", products);

process.exit(0);
