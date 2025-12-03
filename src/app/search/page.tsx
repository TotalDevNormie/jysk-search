import Image from "next/image";
import Link from "next/link";
import { api } from "~/trpc/server";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";

import { Badge } from "~/components/ui/badge";
import PaginationClient from "./pagination-client";

const ITEMS_PER_PAGE = 12;

export default async function SearchPage(props: any) {
  const query = props?.searchParams?.query ?? "";
  const currentPage = Number(props?.searchParams?.page ?? "1");

  const products = await api.product.searchResult({ query });
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const current = products.slice(start, end);

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Meklēšanas rezultāti</h1>
        <p className="text-muted-foreground">
          Atrada {products.length}{" "}
          {products.length === 1 ? "product" : "products"} priekš "{query}"
        </p>
      </div>

      {current.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-semibold">Produkti nav atrasti</p>
            <p className="text-muted-foreground">
              Pamēģiniet pamainīt meklēšanu
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {current.map((item) => (
              <Link key={item.sku} href={`/product/${item.sku}`}>
                <Card className="group h-full overflow-hidden transition-all hover:shadow-lg">
                  <div className="bg-muted relative aspect-square overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <CardHeader className="space-y-2">
                    <CardTitle className="line-clamp-2 text-lg leading-tight">
                      {item.title}
                    </CardTitle>

                    <CardDescription>
                      {item.sizes && (
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          Izmērs:{" "}
                          {item.sizes.find((s) => s.sku === item.sku)?.size}
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

          <PaginationClient
            currentPage={currentPage}
            totalPages={totalPages}
            query={query}
          />
        </>
      )}
    </div>
  );
}
