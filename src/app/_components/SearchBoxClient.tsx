"use client";
import { Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductInfo } from "~/server/services/scrapers/getProductInfo";
import { searchSuggestions } from "./searchActions";

function isInt(str: string): boolean {
  const num = Number(str);
  return Number.isInteger(num);
}

type HistoryItem =
  | {
      type: "product";
      sku: string;
      title: string;
      image: string;
      size?: string;
    }
  | { type: "query"; query: string };

export default function SearchBoxClient() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [focus, setFocus] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<
    Omit<ProductInfo, "attributes" | "prices">[]
  >([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load history
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("searchHistory") || "[]");
      setHistory(saved);
    } catch {
      setHistory([]);
    }
  }, []);

  const saveHistory = (item: HistoryItem) => {
    try {
      const updated = [
        item,
        ...history.filter((h) =>
          item.type === "product"
            ? h.type !== "product" || h.sku !== item.sku
            : h.type !== "query" || h.query !== item.query,
        ),
      ].slice(0, 10);

      setHistory(updated);
      localStorage.setItem("searchHistory", JSON.stringify(updated));
    } catch {}
  };

  const handleSearchRedirect = async () => {
    if (!term.trim()) return;

    const sku = term.trim();

    if (isSixDigit(sku)) {
      let product = suggestions.find((p) => p.sku === sku);

      if (!product) {
        try {
          const result = await searchSuggestions(sku);
          product = result.find((r) => r.sku === sku);
        } catch {}
      }

      if (product) {
        saveHistory({
          type: "product",
          sku: product.sku,
          title: product.title,
          image: product.image,
          size: product.sizes?.find((s) => s.sku === product!.sku)?.size,
        });
      } else {
        saveHistory({
          type: "product",
          sku,
          title: sku,
          image: "",
          size: undefined,
        });
      }

      router.push(`/product/${sku}`);
      inputRef.current?.blur();
      return;
    }

    saveHistory({ type: "query", query: term });
    router.push(`/search?query=${encodeURIComponent(term)}`);
    inputRef.current?.blur();
  };

  const handleSelect = (item: Omit<ProductInfo, "attributes" | "prices">) => {
    saveHistory({
      type: "product",
      sku: item.sku,
      title: item.title,
      image: item.image,
      size: item.sizes?.find((s) => s.sku === item.sku)?.size,
    });

    setFocus(false);
    router.push(`/product/${item.sku}`);
  };

  const handleInputChange = async (value: string) => {
    setTerm(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      if (value.length > 1) {
        try {
          const results = await searchSuggestions(value);
          setSuggestions(results);
        } catch (error) {
          console.error("Search error:", error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    }, 300);
  };

  const isSixDigit = (str: string) => /^\d{6}$/.test(str);

  const words = term.split(/\s+/).filter(Boolean);
  const last = words[words.length - 1];
  const isSearchingSize = words.length >= 2 && last ? isInt(last) : false;

  return (
    <div className="sticky top-0 z-10 flex w-full items-center justify-between shadow-sm">
      <Image
        src="https://www.jysk.lv/media/logo/default/jysk-logo-outline.png"
        width={70}
        height={70}
        alt="Jysk logo"
        className="cursor-pointer p-4"
        onClick={() => {
          setTerm("");
          setFocus(false);
          router.push("/");
        }}
      />

      <input
        value={term}
        ref={inputRef}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 100)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearchRedirect();
        }}
        className="w-full p-4"
        placeholder="Meklēt..."
      />

      <button
        className="border-gray flex cursor-pointer gap-4 border-l-2 p-4"
        onClick={handleSearchRedirect}
      >
        <Search />
        Meklēt
      </button>

      {focus && (
        <div className="border-gray absolute top-full grid max-h-[80vh] w-full overflow-auto border-t-2 bg-white">
          {!term && history.length > 0 && (
            <div className="p-2">
              <p className="px-4 py-2 text-sm text-gray-500">Vēsture</p>
              {history.map((item, i) =>
                item.type === "product" ? (
                  <HistoryProduct key={i} item={item} router={router} />
                ) : (
                  <HistoryQuery key={i} item={item} router={router} />
                ),
              )}
            </div>
          )}

          {/* Show suggestions */}
          {term &&
            suggestions.length > 0 &&
            !isSixDigit(term) &&
            suggestions.map((item) => (
              <SearchItem
                key={item.sku + "-search"}
                item={item}
                handleSelect={() => handleSelect(item)}
                withSize={isSearchingSize}
              />
            ))}

          {/* Exact SKU match */}
          {term &&
            isSixDigit(term) &&
            suggestions.find((p) => p.sku === term) && (
              <SearchItem
                item={suggestions.find((p) => p.sku === term)!}
                withSize
                handleSelect={() =>
                  handleSelect(suggestions.find((p) => p.sku === term)!)
                }
              />
            )}
        </div>
      )}
    </div>
  );
}

function HistoryQuery({
  item,
  router,
}: {
  item: { type: "query"; query: string };
  router: any;
}) {
  return (
    <div
      onMouseDown={() =>
        router.push(`/search?query=${encodeURIComponent(item.query)}`)
      }
      className="cursor-pointer border-b px-4 py-3 hover:bg-gray-50"
    >
      {item.query}
    </div>
  );
}

function HistoryProduct({
  item,
  router,
}: {
  item: {
    type: "product";
    sku: string;
    title: string;
    image: string;
    size?: string;
  };
  router: any;
}) {
  const fakeProduct = {
    sku: item.sku,
    title: item.title,
    image: item.image,
    sizes: item.size ? [{ sku: item.sku, size: item.size }] : undefined,
  };

  return (
    <SearchItem
      item={fakeProduct}
      handleSelect={() => router.push(`/product/${item.sku}`)}
      withSize={!!item.size}
    />
  );
}

const SearchItem = ({
  item,
  handleSelect,
  withSize,
}: {
  item: Omit<ProductInfo, "attributes" | "prices" | "url">;
  handleSelect: () => void;
  withSize?: boolean;
}) => (
  <div
    onMouseDown={handleSelect}
    className="border-gray flex cursor-pointer gap-4 border-b-2 p-4 hover:bg-gray-50"
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
        {withSize && item.sizes && (
          <span className="text-gray-500">
            ( {item.sizes?.find((i) => i.sku === item.sku)?.size} )
          </span>
        )}
      </p>

      <p className="text-gray-500">
        SKU:{" "}
        {item.sizes && !withSize
          ? item.sizes.map((s) => s.sku).join(", ")
          : item.sku}
      </p>
    </div>
  </div>
);
