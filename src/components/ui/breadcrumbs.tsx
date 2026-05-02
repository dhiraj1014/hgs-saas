import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em]", className)}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1">
            {c.href && !last ? (
              <Link
                href={c.href}
                className="text-mute transition-colors hover:text-[#B26116]"
              >
                {c.label}
              </Link>
            ) : (
              <span className={cn(last ? "text-ink" : "text-mute")}>{c.label}</span>
            )}
            {!last && <ChevronRight className="size-3 text-mute" />}
          </span>
        );
      })}
    </nav>
  );
}
