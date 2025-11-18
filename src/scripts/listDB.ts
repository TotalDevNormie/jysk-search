import { db } from "../server/services/db.ts";

// List all categories
console.log("works");
const categories = db.prepare("SELECT * FROM categories").all();
console.log(categories);

// List product links
const products = db.prepare("SELECT * FROM product_links LIMIT 20").all();
console.log(products);
