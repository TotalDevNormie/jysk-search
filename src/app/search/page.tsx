"use client";
import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { ProductInfo } from "~/server/services/scrapers/getProductInfo";
import Link from "next/link";
import { api } from "~/trpc/react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

const ITEMS_PER_PAGE = 12;

export default function SearchResultsPage() {
  const params = useSearchParams();
  const query = params.get("query") || "";
  const [currentPage, setCurrentPage] = useState(1);

  const search = api.product.searchSuggestions.useQuery({ query });

  const products = search?.data || [];
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = products.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (showEllipsisStart) {
        pages.push("ellipsis-start");
      }

      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }

      if (showEllipsisEnd) {
        pages.push("ellipsis-end");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Meklēšanas rezultāti</h1>
        <p className="text-muted-foreground">
          Atrada {products.length}{" "}
          {products.length === 1 ? "product" : "products"} priekš vaicājuma "{query}"
        </p>
      </div>

      {search.isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="bg-muted aspect-square animate-pulse" />
              <CardHeader>
                <div className="bg-muted h-4 animate-pulse rounded" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : currentProducts.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-semibold">Produkti nav atrasti</p>
            <p className="text-muted-foreground">Pamēģinat pamainīt meklēšanu</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {currentProducts.map((item: ProductInfo) => (
              <Link key={item.sku} href={`/product/${item.sku}`}>
                <Card className="group h-full overflow-hidden transition-all hover:shadow-lg">
                  <div className="bg-muted relative aspect-square overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <CardHeader className="space-y-2">
                    <CardTitle className="line-clamp-2 text-lg leading-tight">
                      {item.title}
                    </CardTitle>
                    <CardDescription>
                      {item?.sizes && (
                        <Badge variant="secondary" className="font-mono text-xs">
                         Izmērs: {item.sizes.find((s) => s.sku === item.sku)?.size}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="font-mono text-xs">
                        SKU: {item.sku}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {getPageNumbers().map((page, idx) => (
                  <PaginationItem key={idx}>
                    {typeof page === "number" ? (
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    ) : (
                      <PaginationEllipsis />
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
