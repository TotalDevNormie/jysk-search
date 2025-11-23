"use client";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";
import { useRouter } from "next/navigation";

export function SizeSelect({ sizes, currentSku } : { sizes: { sku: string, size: string }[], currentSku: string }) {
  const router = useRouter();

  return (
    <Select
      defaultValue={currentSku}
      onValueChange={(value) => router.push(`/product/${value}`)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Izmērs" />
      </SelectTrigger>
      <SelectContent>
        {sizes.map((size) => (
          <SelectItem key={size.sku} value={size.sku}>
            {size.size}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
