"use client";

import { ErrorScreen } from "@/components/shared/error-screen";

export default function StaffError({
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
      backHref="/dashboard"
      backLabel="Back to dashboard"
      variant="embedded"
    />
  );
}
