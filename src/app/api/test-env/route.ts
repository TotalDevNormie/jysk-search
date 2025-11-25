// app/api/test-env/route.ts
export async function GET() {
  return new Response(JSON.stringify({
    DATABASE_URL: process.env.DATABASE_URL || null
  }));
}
