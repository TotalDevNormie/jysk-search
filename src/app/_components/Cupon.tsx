import { Suspense } from "react";
import { Spinner } from "~/components/ui/spinner";
import { api } from "~/trpc/server";

export default function Cupon() {
  const cupon = api.scrape.getCupon();
  return (
    <div className="fixed right-0 bottom-0 w-full bg-black p-4 text-center text-white">
      <Suspense fallback={<Spinner />}>
        <p>{cupon}</p>
      </Suspense>
    </div>
  );
}
