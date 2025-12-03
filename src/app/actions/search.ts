"use server";

import { redirect } from "next/navigation";

export async function handleSearch(formData: FormData) {
  const term = formData.get("query")?.toString()?.trim() ?? "";

  if (!term) return;

  if (/^\d{6}$/.test(term)) {
    redirect(`/product/${term}`);
  } else {
    redirect(`/search?query=${encodeURIComponent(term)}`);
  }
}
