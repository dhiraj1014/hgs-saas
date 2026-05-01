"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-mute">Enter the 6-digit code sent to {phone}.</p>
      <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6}
        className="w-full border border-rule rounded px-3 py-2 text-center tracking-widest font-mono" />
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <Button type="submit" disabled={pending || code.length !== 6} className="w-full">
        {pending ? "Verifying…" : "Verify"}
      </Button>
    </form>
  );
}

export default function VerifyPage() {
  return (
    <div className="max-w-sm mx-auto py-12 space-y-6">
      <h1 className="text-2xl font-serif">Enter code</h1>
      <Suspense fallback={null}><VerifyForm /></Suspense>
    </div>
  );
}
