import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const sql = postgres(process.env.DATABASE_URL ?? '', {
  ssl: 'require', // Railway requires SSL
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});



export const db = drizzle({client: pool});
