import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "~/trpc/server";
import type { ProductInfo } from "~/server/services/scrapers/getProductInfo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
import { PaginationControls } from "./pagination-controls";

const ITEMS_PER_PAGE = 12;

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SearchResults query={params.query} page={params.page} />
    </Suspense>
  );
}

async function SearchResults({
  query = "",
  page = "1",
}: {
  query?: string;
  page?: string;
}) {
  const currentPage = Math.max(1, parseInt(page) || 1);

  const { products, total } = await api.product.searchResult({
    query,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  // Ensure currentPage doesn't exceed totalPages
  const safePage = Math.min(currentPage, totalPages);

  // Add a unique key based on query to force re-render
  const searchKey = `${query}-${safePage}`;
  console.log(products);

  return (
    <div className="container mx-auto space-y-8 p-6" key={searchKey}>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Meklēšanas rezultāti
        </h1>
        <p className="text-muted-foreground">
          Atrada {total} {total === 1 ? "product" : "products"} priekš vaicājuma
          "{query}"
        </p>
      </div>

      {products.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-semibold">Produkti nav atrasti</p>
            <p className="text-muted-foreground">
              Pamēģinat pamainīt meklēšanu
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((item: ProductInfo) => (
              <Link key={item.sku} href={`/product/${item.sku}`}>
                <Card className="grid transition-all hover:shadow-lg">
                  <div className="bg-muted relative aspect-square">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-2 w-full text-lg leading-tight break-words">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="min-w-0 space-y-2">
                      {item?.sizes && (
                        <p>
                          Izmērs:{" "}
                          {item.sizes.find((s) => s.sku === item.sku)?.size}
                        </p>
                      )}
                      <Badge variant="secondary" className="block break-words">
                        SKU: {item.sku}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <PaginationControls
              currentPage={safePage}
              totalPages={totalPages}
              query={query}
            />
          )}
        </>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto space-y-8 p-6">
      <div className="space-y-2">
        <div className="bg-muted h-10 w-64 animate-pulse rounded" />
        <div className="bg-muted h-6 w-96 animate-pulse rounded" />
      </div>
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
    </div>
  );
}
