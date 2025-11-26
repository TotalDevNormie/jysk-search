import { db } from "~/server/db";
import { products } from "~/server/db/schema";


export async function GET() {
  try {
    const result = await db.select().from(products).limit(1);
    return new Response(JSON.stringify({ ok: true, result }));
  } catch (err) {
    return new Response(`DB ERROR: ${err}`, { status: 500 });
  }
}
