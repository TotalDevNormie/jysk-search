import { NextResponse } from "next/server";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export async function GET() {
  try {
    const ctx = await createTRPCContext({ headers: new Headers() });
    const caller = appRouter.createCaller(ctx);

    const res = await caller.product.getProductBySku({ sku: "133891" });

    return NextResponse.json({ ok: true, res });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
