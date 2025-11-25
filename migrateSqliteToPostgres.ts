import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import 'dotenv/config';
import { categories, product_links, products, product_alternate_skus } from "./src/server/db/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // if using Railway with self-signed certs
});

const db = drizzle(pool);

// open SQLite database
const sqliteDb = new Database("scraper.db");

async function migrateCategories() {
  const rows: any[] = sqliteDb.prepare("SELECT * FROM categories").all();
  const formatted = rows.map(row => ({
    ...row,
    last_attempt: row.last_attempt ? new Date(row.last_attempt) : null,
  }));

  if (formatted.length) {
    await db.insert(categories).values(formatted).onConflictDoNothing();
  }
}

async function migrateProductLinks() {
  const rows: any[] = sqliteDb.prepare("SELECT * FROM product_links").all();
  const formatted = rows.map(row => ({
    ...row,
    scraped_at: row.scraped_at ? new Date(row.scraped_at) : null,
  }));

  if (formatted.length) {
    await db.insert(product_links).values(formatted).onConflictDoNothing();
  }
}

async function migrateProducts() {
  const rows: any[] = sqliteDb.prepare("SELECT * FROM products").all();
  const formatted = rows.map(row => ({
    ...row,
    scraped_at: row.scraped_at ? new Date(row.scraped_at) : null,
    prices: row.prices ? JSON.parse(row.prices) : null,
    attributes: row.attributes ? JSON.parse(row.attributes) : null,
    sizes: row.sizes ? JSON.parse(row.sizes) : null,
  }));

  if (formatted.length) {
    await db.insert(products).values(formatted).onConflictDoNothing();
  }
}

async function migrateAlternateSkus() {
  const rows: any[] = sqliteDb.prepare("SELECT * FROM product_alternate_skus").all();
  if (rows.length) {
    await db.insert(product_alternate_skus).values(rows).onConflictDoNothing();
  }
}

async function main() {
  console.log("Migrating categories...");
  await migrateCategories();

  console.log("Migrating product_links...");
  await migrateProductLinks();

  console.log("Migrating products...");
  await migrateProducts();

  console.log("Migrating product_alternate_skus...");
  await migrateAlternateSkus();

  console.log("Migration complete!");
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
