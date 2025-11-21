"use client";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function SearchBox() {
  const [term, setTerm] = useState("");

  // run search when term changes
  const search = api.product.searchSuggestions.useQuery(
    { query: term },
    {
      enabled: term.length > 1, // avoid spam
    }
  );

  return (
    <div>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search..."
      />

      {/* suggestions */}
      <ul>
        {search.data?.map((item) => (
          <li key={item.id}>
            <img src={item.image} width={40} height={40} />
            <span>{item.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
