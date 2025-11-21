// src/app/product/[sku]/page.tsx
import Image from "next/image";
import { api } from "~/trpc/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Suspense } from "react";
import type { ProductAvailability } from "~/server/services/scrapers/getAvailability";

type Props = {
  params: { sku: string };
};

export default async function ProductPage({ params }: Props) {
  const { sku } = params;
  const store = "JYSK Krasta";

  // You can call your server-side API directly
  const data = await api.product.getProductBySku({ sku });
  const availability = data.url
    ? api.product.getProductAvailability({ link: data.url })
    : null;
  console.log(data);
  console.log(availability);
  return (
    <div className="p-4">
      <div className="flex justify-between gap-4">
        <h1>{data.title}</h1>
        <span>SKU: {data.sku}</span>
      </div>
      <Suspense>
        <AvailabilityMain availabilityPromise={availability} store={store} />
      </Suspense>

      <div className="relative mx-auto h-96 w-96 rounded-lg">
        <Image
          src={data.image}
          alt={data.title}
          width={500}
          height={500}
          className="block"
        />
      </div>
      <Accordion type="single" collapsible defaultValue="info">
        <AccordionItem value="info">
          <AccordionTrigger>Produkta informācija</AccordionTrigger>
          <AccordionContent>
            {data.description && (
              <div>
                <h2>Apraksts: </h2>
                <p className="text-sm">{data.description}</p>
              </div>
            )}
            <div>
              <h2>Papildus informācija:</h2>
              <ul>
                {JSON.parse(data.attributes).map((attribute) => (
                  <li key={attribute.label}>
                    {attribute.label}: {attribute.data}
                  </li>
                ))}
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        <Suspense fallback={<div>Gaidat...</div>}>
          <AvailabilityAccordion availabilityPromise={availability} />
        </Suspense>
      </Accordion>
      {/* other product info */}
    </div>
  );
}

async function AvailabilityAccordion({
  availabilityPromise,
}: {
  availabilityPromise: Promise<ProductAvailability> | null;
}) {
  const availability = await availabilityPromise;
  const grouped = availability?.stores.reduce((acc, store) => {
    const city = store.city || "";
    if (!acc[city]) acc[city] = [];
    acc[city].push(store);
    return acc;
  }, {});

  console.log("availability", availability);

  if (!availability) return null;

  return (
    <AccordionItem value="availability">
      <AccordionTrigger>Pieejamība veikalos</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-6">
          {Object.entries(grouped).map(([city, stores], i, arr) => (
            <div key={city}>
              <h3 className="mb-2 font-semibold">{city}</h3>
              <ul className="ml-4 list-disc space-y-1">
                {stores.map((s) => (
                  <li key={s.address}>
                    <div>{s.address}</div>
                    <div>{s.stock}</div>
                    {s.sampleAvailable && <div>Paraugs pieejams</div>}
                  </li>
                ))}
              </ul>

              {i !== arr.length - 1 && (
                <div className="mt-4 border-b border-white/20" />
              )}
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
  const storeAvailability = availability.stores.find((s) =>
    s.address.includes(store),
  );

  return (
    <h3>
      Pieejamība {store}: {storeAvailability?.stock}
    </h3>
  );
}
