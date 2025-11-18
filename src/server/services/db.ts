import Database from "better-sqlite3";

// Open (or create) the SQLite database file
export const db = new Database("scraper.db");

// Create categories table
db.exec(`
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    last_attempt DATETIME,
    attempts INTEGER DEFAULT 0
);
`);

// Create product links table
db.exec(`
CREATE TABLE IF NOT EXISTS product_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE,
    category_url TEXT,
    scraped_at DATETIME
);
`);

// **Add scraped column safely**
try {
  db.exec(`ALTER TABLE product_links ADD COLUMN scraped INTEGER DEFAULT 0`);
  console.log("Added scraped column to product_links.");
} catch (err) {
  console.log("scraped column already exists, skipping.");
}

// Create products table
db.exec(`
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE,
    title TEXT,
    sku TEXT,
    image TEXT,
    description TEXT,
    prices JSON,
    attributes JSON,
    sizes JSON,
    scraped_at DATETIME
);
`);
