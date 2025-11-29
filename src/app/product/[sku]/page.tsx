import Image from "next/image";
import { api } from "~/trpc/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Spinner } from "~/components/ui/spinner";
import { Suspense } from "react";
import type { ProductAvailability } from "~/server/services/scrapers/getAvailability";
import { SizeSelect } from "~/app/_components/sizeSelect";
import Link from "next/link";
import { Separator } from "~/components/ui/separator";

type Props = {
  params: Promise<{ sku: string }>;
};

export default async function ProductPage({ params }: Props) {
  const { sku } = await params;
  const store = "JYSK Krasta";

  // You can call your server-side API directly
  const data = await api.product.getProductBySku({ sku });
  console.log(data);
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
  return (
    <div className="grid gap-8 p-4">
      <div className="flex justify-between gap-4">
        <h1 className="text-3xl font-bold">{data.title}</h1>
        <span className="text-nowrap">SKU: {data.sku}</span>
      </div>
      {/* <Suspense> */}
      {/*   <Cupon availibility={availability} /> */}
      {/* </Suspense> */}
      <div>
        <h2 className="flex items-center gap-2">
          Pieejamība {store}:{" "}
          <Suspense fallback={<Spinner />}>
            <AvailabilityMain
              availabilityPromise={availability}
              store={store}
            />
          </Suspense>
        </h2>
        <h2 className="flex items-center gap-2">
          Pieejamība JYSK pakomātā, Ulbrokas iela 48:{" "}
          <Suspense fallback={<Spinner />}>
            <AvailabilityMain
              availabilityPromise={availability}
              store={"JYSK Pakomāts un noliktava"}
            />
          </Suspense>
        </h2>
      </div>

      <div className="relative mx-auto h-[40vh] w-full rounded-lg p-4">
        <Image
          src={data.image}
          alt={data.title}
          fill
          className="h-full w-full object-contain"
        />
      </div>
      <div>
        {prices?.regularPrice && (
          <h2 className="text-3xl font-bold">{prices.regularPrice} &euro;</h2>
        )}
        {prices?.oldPrice && prices?.specialPrice && (
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-red-500">
              {prices.specialPrice} &euro;
            </h2>
            <span className="text-gray text-sm line-through">
              {prices.oldPrice} &euro;
            </span>
          </div>
        )}
        {prices?.loyaltyPrice && (
          <h2 className="text-3xl font-bold text-blue-500">
            {prices.loyaltyPrice} &euro;{" "}
            <Image
              className="inline"
              alt="loyalty card"
              src="https://www.jysk.lv/static/version1763707917/frontend/Jysk/default/lv_LV/images/media/client_card.png"
              width={40}
              height={40}
            ></Image>
          </h2>
        )}
      </div>

      {data?.sizes && <SizeSelect sizes={data?.sizes} currentSku={data.sku} />}

      <p>
        <span className="font-semibold">Apskatīties mājaslapā: </span>
        <Link
          className="text-blue-500 hover:underline"
          target="_blank"
          href={data?.url}
        >
          {data?.url}
        </Link>
      </p>

      <Accordion type="multiple">
        <AccordionItem value="info">
          <AccordionTrigger className="text-xl font-bold">
            Produkta informācija
          </AccordionTrigger>
          <AccordionContent className="grid gap-4">
            {data.description && (
              <div>
                <h2 className="text-lg font-bold">Apraksts: </h2>
                <p className="p-2">{data.description}</p>
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold">Papildus informācija:</h2>
              <ul>
                {data?.attributes?.map(
                  (attribute: { label: string; data: string }) => (
                    <li
                      key={attribute.label}
                      className="border-gray border-b-2 p-2"
                    >
                      <span className="font-bold">{attribute.label}:</span>{" "}
                      {attribute.data}
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
        return "text-yellow-500";
      } else {
        return "text-green-500";
      }
    } else if (stock == "Vairāk par 5") {
      return "text-green-500";
    } else {
      return "text-red-500";
    }
  };

  if (!availability) return null;

  return (
    <AccordionItem value="availability">
      <AccordionTrigger className="text-xl font-bold">
        Pieejamība veikalos
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-6">
          {Object.entries(grouped || {}).map(([city, stores]) => (
            <div key={city}>
              <h3 className="text-md mb-2 font-semibold">{city}</h3>
              <ul className="grid gap-2">
                {stores.map((s) => (
                  <li key={s.address}>
                    <div className="flex justify-between gap-2 p-4">
                      <p className="text-md font-medium">{s.address}</p>
                      <div>
                        <p className={`${getColor(s.stock)} text-right`}>
                          {s.stock}
                        </p>
                        <p>
                          {s.sampleAvailable && (
                            <span>Paraugs pieejams veikalā</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Separator />
                  </li>
                ))}
              </ul>

              {/* {i !== arr.length - 1 && ( */}
              {/*   <div className="mt-4 border-b border-white/20" /> */}
              {/* )} */}
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
  if (!availability) return <span className="text-red-500">Nav noliktavā</span>;
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
      color = "text-yellow-500";
    } else {
      color = "text-green-500";
    }
  } else if (storeAvailability?.sampleAvailable) {
    availabilityText = "Paraugs ir pieejams veikalā";
    color = "";
  } else {
    availabilityText = "Nav noliktavā";
    color = "text-red-500";
  }

  return <span className={color}>{availabilityText}</span>;
}
