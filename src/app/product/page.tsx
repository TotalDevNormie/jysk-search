// src/app/product/page.tsx
import { redirect } from "next/navigation";

export default function ProductIndex() {
  // Redirect immediately to root
  redirect("/");

  return null; // never rendered
}
