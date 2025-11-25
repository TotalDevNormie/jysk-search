"use client";
import { Search } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import type { ProductInfo } from "~/server/services/scrapers/getProductInfo";

export default function SearchBox() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [focus, setFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = api.product.searchSuggestions.useQuery(
    { query: term },
    { enabled: term.length > 2 },
  );

  console.log(search?.data);

  const handleSearchRedirect = () => {
    if (isSixDigit(term)) {
      router.push(`/product/${term}`);
    } else {
      router.push(`/search?query=${encodeURIComponent(term)}`);
    }
    inputRef.current?.blur();
  };

  const handleSelect = (sku: string) => {
    setTerm("");
    setFocus(false);
    router.push(`/product/${sku}`);
  };

  const isSixDigit = (str: string) => /^\d{6}$/.test(str);
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
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 100)} // slight delay for click
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSearchRedirect();
          }
        }}
        className="w-full p-4"
        placeholder="Search..."
      />

      <button
        className="border-gray flex cursor-pointer gap-4 border-l-2 p-4"
        onClick={handleSearchRedirect}
      >
        <Search />
        Meklēt
      </button>

      {focus && search?.data && search?.data?.length > 0 && (
        <div className="border-gray absolute top-full grid w-full border-t-2 bg-white">
          {!isSixDigit(term) &&
            search.data.map((item) => (
              <SearchItem item={item} handleSelect={handleSelect} />
            ))}
          {isSixDigit(term) && search.data.find((p) => p.sku === term) && (
            <SearchItem
              item={search.data.find((p) => p.sku === term)!}
              withSize
              handleSelect={handleSelect}
            />
          )}
        </div>
      )}
    </div>
  );
}

const SearchItem = ({
  item,
  handleSelect,
  withSize,
}: {
  item: Omit<ProductInfo, "attributes" | "prices">;
  handleSelect: (sku: string) => void;
  withSize?: boolean;
}) => (
  <div
    onMouseDown={() => handleSelect(item.sku)}
    key={item.sku + "-search"}
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
        {withSize && item?.sizes && (
          <span className="text-gray-500">
            ( {item.sizes?.find((i) => i.sku === item.sku)?.size} )
          </span>
        )}
      </p>
      <p className="text-gray-500">
        SKU:{" "}
        {item.sizes && !withSize
          ? item?.sizes.map((s) => s.sku).join(", ")
          : item.sku}
      </p>
    </div>
  </div>
);
