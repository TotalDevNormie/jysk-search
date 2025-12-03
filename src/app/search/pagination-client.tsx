"use client";

import { useRouter } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "~/components/ui/pagination";

export default function PaginationClient({
  currentPage,
  totalPages,
  query,
}: {
  currentPage: number;
  totalPages: number;
  query: string;
}) {
  const router = useRouter();

  const go = (p: number) => {
    router.push(`/search?query=${encodeURIComponent(query)}&page=${p}`);
  };

  const getPages = () => {
    const pages: (number | string)[] = [];
    const ellStart = currentPage > 3;
    const ellEnd = currentPage < totalPages - 2;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (ellStart) pages.push("...");
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      if (i > 1 && i < totalPages) pages.push(i);
    }
    if (ellEnd) pages.push("...");

    pages.push(totalPages);
    return pages;
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => go(Math.max(1, currentPage - 1))}
            className={
              currentPage === 1 ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>

        {getPages().map((p, i) => (
          <PaginationItem key={i}>
            {p === "..." ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                isActive={p === currentPage}
                onClick={() => go(p as number)}
                className="cursor-pointer"
              >
                {p}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            onClick={() => go(Math.min(totalPages, currentPage + 1))}
            className={
              currentPage === totalPages ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
