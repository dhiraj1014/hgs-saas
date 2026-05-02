import Link from "next/link";
import { Compass } from "lucide-react";
import { LogoMark } from "@/components/shared/logo-mark";
import {
  HEADER_ACTION_PRIMARY,
  HEADER_ACTION_SECONDARY,
} from "@/components/shared/header-actions";
import { cn } from "@/lib/utils";

export function NotFoundScreen({
  title = "Page not found",
  description = "The page you’re looking for doesn’t exist or may have been moved.",
  primary,
  secondary,
  variant = "centered",
}: {
  title?: string;
  description?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  variant?: "centered" | "embedded";
}) {
  const card = (
    <div className="flex flex-col items-center text-center">
      <span className="mb-5 grid size-12 place-items-center rounded-full bg-saffron/10 text-[#B26116] ring-1 ring-saffron/20">
        <Compass className="size-5" />
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B26116]">
        404 · Not found
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      <p className="mt-2 max-w-md text-sm text-mute">{description}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {primary && (
          <Link href={primary.href} className={cn(HEADER_ACTION_PRIMARY, "h-10 px-4 text-sm")}>
            {primary.label}
          </Link>
        )}
        {secondary && (
          <Link href={secondary.href} className={cn(HEADER_ACTION_SECONDARY, "h-10 px-4 text-sm")}>
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );

  if (variant === "embedded") {
    return (
      <div className="rounded-2xl border border-rule bg-white px-6 py-12 sm:px-10 sm:py-16">
        {card}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-4 py-10">
        <div className="w-full space-y-8">
          <Link href="/" className="flex flex-col items-center text-center">
            <LogoMark size="xl" />
          </Link>
          <div className="rounded-2xl border border-rule bg-white p-8 shadow-sm">
            {card}
          </div>
        </div>
      </div>
    </div>
  );
}
