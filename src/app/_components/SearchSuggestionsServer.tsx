import Image from "next/image";
import Link from "next/link";
import type { ProductInfo } from "~/server/services/scrapers/getProductInfo";
import { api } from "~/trpc/server"; // server import, not react

export default async function SearchSuggestionsServer({
  query,
  handleSelect,
}: {
  query: string;
  handleSelect: (sku: string) => void;
}) {
  if (query.length < 3) return null;

  const products: Omit<ProductInfo, "attributes" | "prices">[] =
    await api.product.searchSuggestions({ query });

  if (products.length === 0) return null;

  const isSixDigit = /^\d{6}$/.test(query);
  const filteredProducts = isSixDigit
    ? products.filter((p) => p.sku === query)
    : products;

  return (
    <div className="border-gray absolute top-full grid w-full border-t-2 bg-white">
      {filteredProducts.map((item) => (
        <div
          key={item.sku + "-search"}
          onMouseDown={() => handleSelect(item.sku)}
          className="border-gray flex cursor-pointer gap-4 border-b-2 p-4"
        >
          <Image
            src={item.image}
            alt={item.title || "product"}
            width={100}
            height={100}
            className="aspect-square h-20 w-20"
          />
          <div>
            <p className="text-xl font-bold">
              {item.title}{" "}
              {isSixDigit && item?.sizes && (
                <span className="text-gray-500">
                  ( {item.sizes?.find((i) => i.sku === item.sku)?.size} )
                </span>
              )}
            </p>
            <p className="text-gray-500">
              SKU:{" "}
              {item.sizes && !isSixDigit
                ? item?.sizes.map((s) => s.sku).join(", ")
                : item.sku}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
