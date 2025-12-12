import Image from "next/image";
import { api } from "~/trpc/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Skeleton } from "~/components/ui/skeleton";
import { Spinner } from "~/components/ui/spinner";
import { Suspense } from "react";
import type { ProductAvailability } from "~/server/services/scrapers/getAvailability";
import { SizeSelect } from "~/app/_components/sizeSelect";
import Link from "next/link";
import { Separator } from "~/components/ui/separator";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductPageSkeleton } from "~/app/_components/ProductPageSkeleton";

type Props = {
  params: Promise<{ sku: string }>;
};

export default async function Page({ params }: Props) {
  const { sku } = await params;
  if (!isSixDigit(sku)) redirect(`/search?query=${sku}`);

  return (
    <Suspense fallback={<ProductPageSkeleton />}>
      <Product params={params} />
    </Suspense>
  );
}

const isSixDigit = (str: string) => /^\d{6}$/.test(str);

async function Product({ params }: Props) {
  const { sku } = await params;

  const cookieStore = await cookies();
  const store = cookieStore.get("store")?.value ?? "JYSK Krasta";

  const data = await api.product.getProductBySku({ sku });

  console.log(data);

  if (!data)
    return (
      <div>
        <h1 className="pt-16 text-center text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          Produkts nav atrasts
        </h1>
      </div>
    );

  const object =
    data?.url && data?.sizes
      ? {
          link: data.url,
          size: data?.sizes?.find(
            (s: { size: string; sku: string }) => s.sku === sku,
          )?.size,
        }
      : { link: data.url };
  const availability = data?.url
    ? api.scrape.getProductAvailability(object)
    : null;
  const prices = data?.prices;
  console.log("availability", availability);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-8 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
            {data.title}
          </h1>
          <span className="text-sm text-gray-500">SKU: {data.sku}</span>
        </div>
      </div>

      {/* Availability Section */}
      <div className="mb-8 space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-5">
        <h2 className="mb-4 text-lg font-semibold">Pieejamība</h2>

        <div className="flex items-start gap-3">
          <span className="min-w-0 flex-1 text-sm text-gray-700">{store}:</span>
          <Suspense fallback={<Spinner />}>
            <AvailabilityMain
              availabilityPromise={availability}
              store={store}
            />
          </Suspense>
        </div>

        <Separator className="my-3" />

        <div className="flex items-start gap-3">
          <span className="min-w-0 flex-1 text-sm text-gray-700">
            JYSK pakomāts, Ulbrokas iela 48:
          </span>
          <Suspense fallback={<Spinner />}>
            <AvailabilityMain
              availabilityPromise={availability}
              store={"JYSK Pakomāts un noliktava"}
            />
          </Suspense>
        </div>
      </div>

      {/* Image Section */}
      <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
        <Image
          src={data.image}
          alt={data.title}
          fill
          className="object-contain p-4"
        />
      </div>

      {/* Price Section */}
      <Suspense fallback={<Spinner />}>
        <Price availabilityPromise={availability} />
      </Suspense>

      {/* Size Selection */}
      {data?.sizes && (
        <div className="mb-8">
          <SizeSelect sizes={data?.sizes} currentSku={data.sku} />
        </div>
      )}

      {/* Product Link */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <span className="text-sm font-medium text-gray-700">
          Apskatīties mājaslapā:{" "}
        </span>
        <Link
          className="text-sm break-all text-blue-600 hover:text-blue-800 hover:underline"
          target="_blank"
          href={data?.url}
        >
          {data?.url}
        </Link>
      </div>

      {/* Accordion Section */}
      <Accordion type="multiple" className="space-y-2">
        <AccordionItem
          value="info"
          className="rounded-lg border border-gray-200"
        >
          <AccordionTrigger className="px-5 py-4 text-lg font-semibold hover:no-underline">
            Produkta informācija
          </AccordionTrigger>
          <AccordionContent className="space-y-6 px-5 pb-5">
            {data.description && (
              <div>
                <h3 className="mb-2 text-base font-semibold">Apraksts</h3>
                <p className="text-sm leading-relaxed text-gray-700">
                  {data.description}
                </p>
              </div>
            )}
            <div>
              <h3 className="mb-3 text-base font-semibold">
                Papildus informācija
              </h3>
              <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                {data?.attributes?.map(
                  (attribute: { label: string; data: string }) => (
                    <li
                      key={attribute.label}
                      className="flex justify-between gap-4 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {attribute.label}
                      </span>
                      <span className="text-sm text-gray-600">
                        {attribute.data}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        <Suspense fallback={<Spinner />}>
          <AvailabilityAccordion availabilityPromise={availability} />
        </Suspense>
      </Accordion>
    </div>
  );
}

async function Price({
  availabilityPromise,
}: {
  availabilityPromise: Promise<ProductAvailability> | null;
}) {
  const availability = await availabilityPromise;
  const prices = availability?.prices;
  return (
    <div className="mb-8 space-y-3">
      {prices?.regularPrice && (
        <div className="text-2xl font-bold tracking-tight">
          {prices.regularPrice} &euro;
        </div>
      )}
      {prices?.oldPrice && prices?.specialPrice && (
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold tracking-tight text-red-600">
            {prices.specialPrice} &euro;
          </span>
          <span className="text-lg text-gray-400 line-through">
            {prices.oldPrice} &euro;
          </span>
        </div>
      )}
      {prices?.loyaltyPrice && (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-blue-700">
            {prices.loyaltyPrice} &euro;
          </span>
          <Image
            className="inline"
            alt="loyalty card"
            src="https://www.jysk.lv/static/version1763707917/frontend/Jysk/default/lv_LV/images/media/client_card.png"
            width={32}
            height={32}
          />
        </div>
      )}
    </div>
  );
}

async function AvailabilityAccordion({
  availabilityPromise,
}: {
  availabilityPromise: Promise<ProductAvailability> | null;
}) {
  const availability = await availabilityPromise;
  const grouped = availability?.stores.reduce<
    Record<string, ProductAvailability["stores"][number][]>
  >((acc, store) => {
    const city = store.city || "";
    if (!acc[city]) acc[city] = [];
    acc[city].push(store);
    return acc;
  }, {});

  console.log("availability", availability);

  const getColor = (stock: string) => {
    if (parseInt(stock)) {
      if (parseInt(stock) < 5) {
        return "text-yellow-600";
      } else {
        return "text-green-600";
      }
    } else if (stock == "Vairāk par 5") {
      return "text-green-600";
    } else {
      return "text-red-600";
    }
  };

  if (!availability) return null;

  return (
    <AccordionItem
      value="availability"
      className="rounded-lg border border-gray-200"
    >
      <AccordionTrigger className="px-5 py-4 text-lg font-semibold hover:no-underline">
        Pieejamība veikalos
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-5">
        <div className="space-y-6">
          {Object.entries(grouped || {}).map(([city, stores]) => (
            <div key={city}>
              <h3 className="mb-3 text-base font-semibold text-gray-900">
                {city}
              </h3>
              <ul className="space-y-2">
                {stores.map((s) => (
                  <li
                    key={s.address}
                    className="rounded-lg border border-gray-200 bg-white"
                  >
                    <div className="flex items-start justify-between gap-4 p-4">
                      <p className="min-w-0 flex-1 text-sm font-medium text-gray-700">
                        {s.address}
                      </p>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${getColor(s.stock)}`}
                        >
                          {s.stock}
                        </p>
                        {s.sampleAvailable && (
                          <p className="mt-1 text-xs text-gray-500">
                            Paraugs pieejams
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

async function AvailabilityMain({
  availabilityPromise,
  store,
}: {
  availabilityPromise: Promise<ProductAvailability> | null;
  store: string;
}) {
  const availability = await availabilityPromise;
  if (!availability)
    return (
      <span className="text-sm font-medium text-red-600">Nav noliktavā</span>
    );
  const storeAvailability = availability.stores.find((s) =>
    s.address.includes(store),
  );

  let availabilityText: string;
  let color: string;

  console.log(
    "store: ",
    storeAvailability,
    parseInt(storeAvailability?.stock || ""),
  );

  if (
    parseInt(storeAvailability?.stock || "") ||
    storeAvailability?.stock == "Vairāk par 5"
  ) {
    availabilityText = storeAvailability?.stock || "";
    const stockNum = parseInt(storeAvailability?.stock || "0");
    if (stockNum > 0 && stockNum < 5) {
      color = "text-yellow-600";
    } else {
      color = "text-green-600";
    }
  } else if (storeAvailability?.sampleAvailable) {
    availabilityText = "Paraugs ir pieejams";
    color = "text-gray-700";
  } else {
    availabilityText = "Nav noliktavā";
    color = "text-red-600";
  }

  return (
    <span className={`text-sm font-medium ${color}`}>{availabilityText}</span>
  );
}
