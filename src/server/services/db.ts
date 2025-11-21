import Database from "better-sqlite3";

export const db = new Database("scraper.db");

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  last_attempt DATETIME,
  attempts INTEGER DEFAULT 0
);
`);

// product links table
db.exec(`
CREATE TABLE IF NOT EXISTS product_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE,
  category_url TEXT,
  scraped_at DATETIME,
  scraped INTEGER DEFAULT 0
);
`);

// Products table
db.exec(`CREATE TABLE IF NOT EXISTS products (
    sku TEXT PRIMARY KEY,
    url TEXT UNIQUE,
    title TEXT,
    image TEXT,
    description TEXT,
    prices JSON,
    attributes JSON,
    sizes JSON,
    scraped_at DATETIME
);`);

// Alternate SKUs table
db.exec(`CREATE TABLE IF NOT EXISTS product_alternate_skus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_sku TEXT NOT NULL,
    alt_sku TEXT UNIQUE NOT NULL,
    FOREIGN KEY(product_sku) REFERENCES products(sku)
);`);

// Indexes
db.exec(`CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);`);

db.exec(
  `CREATE INDEX IF NOT EXISTS idx_alt_sku ON product_alternate_skus(alt_sku);`,
);

db.exec(
  `CREATE INDEX IF NOT EXISTS idx_alt_product_sku ON product_alternate_skus(product_sku);`,
);
