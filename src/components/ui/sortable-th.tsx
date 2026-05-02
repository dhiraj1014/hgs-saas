import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

/**
 * Server-rendered sortable column header. Clicking cycles between asc / desc
 * for that key by mutating the URL search params. State of the sort is read
 * from `currentKey` + `currentDir` (decided by the page's searchParams).
 */
export function SortableTh({
  label,
  sortKey,
  currentKey,
  currentDir,
  basePath,
  searchParams,
  className,
  align = "left",
}: {
  label: string;
  sortKey: string;
  currentKey: string | undefined;
  currentDir: SortDir | undefined;
  basePath: string;
  /**
   * The page's existing searchParams (everything except sort/dir). The link
   * preserves them so search/filter state survives a sort click.
   */
  searchParams: Record<string, string | undefined>;
  className?: string;
  align?: "left" | "right";
}) {
  const active = currentKey === sortKey;
  const nextDir: SortDir = active && currentDir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (k === "sort" || k === "dir" || k === "page" || v === undefined || v === "") continue;
    params.set(k, v);
  }
  params.set("sort", sortKey);
  params.set("dir", nextDir);
  const href = `${basePath}?${params.toString()}`;

  const Arrow = !active ? ArrowUpDown : currentDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th className={cn("px-4 py-3 font-semibold", className)}>
      <Link
        href={href}
        scroll={false}
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors",
          align === "right" && "ml-auto flex justify-end",
          active ? "text-ink" : "text-mute hover:text-ink",
        )}
      >
        <span>{label}</span>
        <Arrow
          className={cn(
            "size-3 transition-opacity",
            active ? "opacity-100" : "opacity-50",
          )}
        />
      </Link>
    </th>
  );
}
