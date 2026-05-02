"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary that fires when the root layout itself throws.
 * Must declare its own <html> + <body> because it replaces the entire tree.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Caught by global-error boundary:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#FBF7F0",
          color: "#111418",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "grid",
          placeItems: "center",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#B26116",
              margin: 0,
            }}
          >
            Application error
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: "8px 0 0", letterSpacing: "-0.025em" }}>
            We hit an unexpected error
          </h1>
          <p style={{ marginTop: 8, color: "#6F6B65", fontSize: 14 }}>
            Sorry — please try again. If it keeps happening, share the reference below with the office.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 16,
                display: "inline-block",
                background: "#F2EBDD",
                padding: "4px 12px",
                borderRadius: 999,
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                color: "#6F6B65",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <div style={{ marginTop: 24 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                cursor: "pointer",
                background: "#D67A1F",
                color: "#111418",
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
