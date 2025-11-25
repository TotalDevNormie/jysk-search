import { pgTable, serial, text, jsonb, timestamp, integer } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  url: text("url").unique().notNull(),
  status: text("status").default("pending"),
  last_attempt: timestamp("last_attempt"),
  attempts: integer("attempts").default(0), // <-- integer, not serial
});

export const product_links = pgTable("product_links", {
  id: serial("id").primaryKey(),
  url: text("url").unique().notNull(),
  category_url: text("category_url"),
  scraped_at: timestamp("scraped_at"),
  scraped: integer("scraped").default(0), // <-- integer, not serial
});

export const products = pgTable("products", {
  sku: text("sku").primaryKey(),
  url: text("url"),
  title: text("title"),
  image: text("image"),
  description: text("description"),
  prices: jsonb("prices"),
  attributes: jsonb("attributes"),
  sizes: jsonb("sizes"),
  scraped_at: timestamp("scraped_at"),
});

export const product_alternate_skus = pgTable("product_alternate_skus", {
  id: serial("id").primaryKey(),
  product_sku: text("product_sku").notNull(),
  alt_sku: text("alt_sku").unique().notNull(),
});
