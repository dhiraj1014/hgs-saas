import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Page-header CTA pill styles. Use these so primary/secondary actions are
 * consistent across every page header in the app.
 */
const base =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium transition-colors cursor-pointer";

export const HEADER_ACTION_PRIMARY = cn(
  base,
  "bg-saffron text-ink hover:bg-[#B26116] hover:text-white",
);

export const HEADER_ACTION_SECONDARY = cn(
  base,
  "border border-rule bg-white text-ink hover:bg-cream",
);

/**
 * Inline helper for `<a>`/`<Link>` elements. Wrap the children with the
 * appropriate class via `className={HEADER_ACTION_PRIMARY}` instead.
 */
export function HeaderActionsRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>;
}
