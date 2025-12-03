import { api, HydrateClient } from "~/trpc/server";
import { Suspense } from "react";

export default async function Home() {
  return (
    <HydrateClient>
      <div className="grid h-full place-items-center gap-8 p-4">
        <div className="grid place-items-center gap-4">
          <h1 className="text-center text-3xl font-bold">JYSK search (beta)</h1>
          <h2 className="text-xl font-bold">Ērtāks rīks produktu meklēšanai</h2>
          <p>
            Šī ir beta versija, tādad ja jums būs kādas problēmas, lūdzu,
            sazinaties ar mani
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
