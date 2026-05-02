"use client";

import Link from "next/link";
import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { phoneNumber } from "@/lib/auth-client";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await phoneNumber.verify({ phoneNumber: phone, code });
      if (result.error) {
        setMsg("Invalid or expired code. Try again.");
        return;
      }
      router.push("/parent/dashboard");
    });
  }

  const masked = phone ? phone.replace(/(\+\d{2})(\d{5})(\d+)/, "$1 $2 $3") : "";

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Enter code</h1>
        <p className="text-sm text-mute">
          We sent a 6-digit code to <span className="font-medium text-ink">{masked}</span>.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">One-time code</Label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            className="w-full rounded-lg bg-cream px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none ring-1 ring-input focus:ring-2 focus:ring-saffron"
          />
        </div>
        {msg && <p className="text-sm text-rose-600">{msg}</p>}
        <Button type="submit" variant="saffron" disabled={pending || code.length !== 6} className="h-11 w-full text-base">
          {pending ? "Verifying…" : "Verify & continue"}
        </Button>
      </form>
      <p className="border-t border-ink/5 pt-4 text-center text-xs text-mute">
        Didn&apos;t receive it?{" "}
        <Link href="/parent-login" className="font-medium text-saffron hover:underline">Try a different number</Link>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
