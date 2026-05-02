"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert, RotateCcw } from "lucide-react";
import { LogoMark } from "@/components/shared/logo-mark";
import {
  HEADER_ACTION_PRIMARY,
  HEADER_ACTION_SECONDARY,
} from "@/components/shared/header-actions";
import { cn } from "@/lib/utils";

/**
 * Branded fallback rendered by route-segment error boundaries.
 * Logs the digest to the console so it's easy to cross-reference with
 * server-side logs.
 */
export function ErrorScreen({
  error,
  reset,
  backHref = "/",
  backLabel = "Back to home",
  variant = "centered",
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  backHref?: string;
  backLabel?: string;
  /**
   * "centered" — full-page splash (use at the top level / auth)
   * "embedded" — inline card (use within an app shell so the chrome stays)
   */
  variant?: "centered" | "embedded";
}) {
  useEffect(() => {
    console.error("Caught by error boundary:", error);
  }, [error]);

  const card = (
    <div className="flex flex-col items-center text-center">
      <span className="mb-5 grid size-12 place-items-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200">
        <TriangleAlert className="size-5" />
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
        Something went wrong
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
        We hit an unexpected error
      </h1>
      <p className="mt-2 max-w-md text-sm text-mute">
        Sorry — that didn&apos;t go as planned. Try again, and if the problem
        persists, please share the reference below with the office.
      </p>
      {error.digest && (
        <p className="mt-4 rounded-full bg-cream px-3 py-1 font-mono text-[11px] text-mute">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {reset && (
          <button
            type="button"
            onClick={reset}
            className={cn(HEADER_ACTION_PRIMARY, "h-10 px-4 text-sm")}
          >
            <RotateCcw className="size-4" /> Try again
          </button>
        )}
        <Link href={backHref} className={cn(HEADER_ACTION_SECONDARY, "h-10 px-4 text-sm")}>
          {backLabel}
        </Link>
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
