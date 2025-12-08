import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";

export function ProductPageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>

      {/* Availability Section */}
      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-5">
        <Skeleton className="h-6 w-32" />

        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-40 flex-1" />
          <Skeleton className="h-5 w-24" />
        </div>

        <Separator className="my-3" />

        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-60 flex-1" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>

      {/* Image */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
        <Skeleton className="absolute inset-0" />
      </div>

      {/* Price */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-40" />
        <div className="flex items-baseline gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      {/* Size Selection */}
      <div>
        <Skeleton className="h-10 w-64" />
      </div>

      {/* Product Link */}
      <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-full" />
      </div>

      {/* Accordion */}
      <Accordion type="multiple" className="space-y-2">
        <AccordionItem
          value="info"
          className="rounded-lg border border-gray-200"
        >
          <AccordionTrigger className="px-5 py-4 text-lg font-semibold hover:no-underline">
            <Skeleton className="h-6 w-48" />
          </AccordionTrigger>
          <AccordionContent className="space-y-6 px-5 pb-5">
            <div>
              <Skeleton className="mb-2 h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
              <Skeleton className="mt-2 h-4 w-4/6" />
            </div>

            <div>
              <Skeleton className="mb-3 h-5 w-40" />
              <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between gap-4 px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="availability"
          className="rounded-lg border border-gray-200"
        >
          <AccordionTrigger className="px-5 py-4 text-lg font-semibold hover:no-underline">
            <Skeleton className="h-6 w-40" />
          </AccordionTrigger>
          <AccordionContent className="space-y-4 px-5 pb-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex justify-between gap-4 border-b pb-3 last:border-none"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
