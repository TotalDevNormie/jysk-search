import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require', // Railway requires SSL
});

export const db = drizzle(sql);
