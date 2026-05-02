import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TablePagination({
  total,
  page,
  size,
  basePath,
  searchParams,
  className,
}: {
  total: number;
  page: number;
  size: number;
  basePath: string;
  /**
   * Existing search params to preserve. The `page` key is overwritten.
   */
  searchParams: Record<string, string | undefined>;
  className?: string;
}) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * size + 1;
  const to = Math.min(total, safePage * size);

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "page" || v === undefined || v === "") continue;
      params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const atFirst = safePage <= 1;
  const atLast = safePage >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-mute",
        className,
      )}
    >
      <p className="text-[12px]">
        <span className="font-medium text-ink">{from}</span>
        <span>–</span>
        <span className="font-medium text-ink">{to}</span>
        <span> of </span>
        <span className="font-medium text-ink">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <PageLink
          href={hrefFor(safePage - 1)}
          disabled={atFirst}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </PageLink>
        <span className="px-2 text-[12px] text-mute">
          Page <span className="font-medium text-ink">{safePage}</span>{" "}
          <span>of</span> <span className="font-medium text-ink">{totalPages}</span>
        </span>
        <PageLink
          href={hrefFor(safePage + 1)}
          disabled={atLast}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-3.5" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
  ...props
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"a">, "href">) {
  const className =
    "inline-flex h-8 items-center gap-1 rounded-lg border border-rule bg-white px-2.5 text-[12px] font-medium text-ink transition-colors";
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(className, "cursor-not-allowed opacity-50")}
        {...props}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(className, "cursor-pointer hover:bg-cream")}
      {...props}
    >
      {children}
    </Link>
  );
}
