"use client";

import { useEffect, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";

export const stores = [
  'JYSK T/C "Spice Home"',
  'JYSK T/C "Maxima XXX" Saharova',
  'JYSK T/C "Maxima XXX" Slokas',
  'JYSK T/C "Domina Shopping"',
  'JYSK T/C "Sāga"',
  "JYSK Vienības gatve",
  "JYSK Krasta",
  'JYSK T/C "Rietumu Centrs"',
  "JYSK Liepāja Ganību",
  'JYSK T/C "Valdeka"',
  "JYSK Daugavpils",
  "JYSK Ventspils",
  "JYSK Tukums",
  "JYSK Rēzekne",
  "JYSK Valmiera",
];

export default function StoreSelect() {
  const [selectedStore, setSelectedStore] = useState<string>("");

  // Load cookie value on first mount
  useEffect(() => {
    const cookieMatch = document.cookie.match(/(?:^|; )store=([^;]*)/);
    const cookieValue = cookieMatch ? decodeURIComponent(cookieMatch[1]!) : null;

    setSelectedStore(cookieValue ?? stores[6]!); // default
  }, []);

  // Update cookie when user selects a value
  function handleChange(value: string) {
    setSelectedStore(value);

    document.cookie = `store=${encodeURIComponent(
      value
    )}; path=/; max-age=31536000`; // 1 year
  }

  return (
    <Select value={selectedStore} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Izvēlies veikalu" />
      </SelectTrigger>

      <SelectContent>
        {stores.map((store) => (
          <SelectItem key={store} value={store}>
            {store}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
