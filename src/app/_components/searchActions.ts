"use server";

import { api } from "~/trpc/server";
import type { ProductInfo } from "~/server/services/scrapers/getProductInfo";

export async function searchSuggestions(
  query: string,
): Promise<Omit<ProductInfo, "attributes" | "prices">[]> {
  if (query.length <= 2) {
    return [];
  }

  try {
    const results = await api.product.searchSuggestions({ query });
    return results;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}
