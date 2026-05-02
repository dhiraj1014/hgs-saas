"use client";

import { ErrorScreen } from "@/components/shared/error-screen";

export default function ParentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      error={error}
      reset={reset}
      backHref="/parent/dashboard"
      backLabel="Back to home"
      variant="embedded"
    />
  );
}
