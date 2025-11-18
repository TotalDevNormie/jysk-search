"use client";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function SearchBox() {
  const [term, setTerm] = useState("");
  const search = api.post.search.useMutation();
  const subcategories = api.scrape.subcategories.useQuery();
  console.log(subcategories.data);
  // const product = api.scrape.product.useQuery({
  //   productLink: "https://www.jysk.lv/sega-stetinden-cool-131342-lv.html",
  // });
  // console.log(product.data, product.status);

  return (
    <div>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search..."
      />
      <button
        onClick={() => search.mutate({ query: term })}
        className="cursor-pointer"
      >
        Search
      </button>

      <p>{search.data?.title}</p>

      {/* <ul> */}
      {/*   <h2>Subcategories, {subcategories?.data?.subcategories?.length}</h2> */}
      {/*   {subcategories?.data?.subcategories?.map((subcategory) => ( */}
      {/*     <li key={subcategory}>{subcategory}</li> */}
      {/*   ))} */}
      {/* </ul> */}
      {/**/}
      {/* <ul> */}
      {/*   <h2>Products, {subcategories.data?.links.length}</h2> */}
      {/*   {subcategories.data?.links.map((product) => ( */}
      {/*     <li key={product}>{product}</li> */}
      {/*   ))} */}
      {/* </ul> */}
      {/**/}
      <h2>Product</h2>
      <img src={`data:image/png;base64,${search.data?.screenshot}`} />
      {/* <img src={`data:image/png;base64,${subcategories.data?.screenshot}`} /> */}
    </div>
  );
}
