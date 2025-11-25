CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'pending',
	"last_attempt" timestamp,
	"attempts" integer DEFAULT 0,
	CONSTRAINT "categories_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "product_alternate_skus" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_sku" text NOT NULL,
	"alt_sku" text NOT NULL,
	CONSTRAINT "product_alternate_skus_alt_sku_unique" UNIQUE("alt_sku")
);
--> statement-breakpoint
CREATE TABLE "product_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"category_url" text,
	"scraped_at" timestamp,
	"scraped" integer DEFAULT 0,
	CONSTRAINT "product_links_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"sku" text PRIMARY KEY NOT NULL,
	"url" text,
	"title" text,
	"image" text,
	"description" text,
	"prices" jsonb,
	"attributes" jsonb,
	"sizes" jsonb,
	"scraped_at" timestamp
);
