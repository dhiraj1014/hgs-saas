"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { requestParentOtp } from "@/server/parent";

export default function ParentLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) { setMsg("Enter your 10-digit mobile number."); return; }
    const full = "+91" + cleaned;
    startTransition(async () => {
      await requestParentOtp(full);
      router.push(`/parent-login/verify?phone=${encodeURIComponent(full)}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Parent sign-in</h1>
        <p className="text-sm text-mute">Enter the mobile number registered with the school.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile number</Label>
          <div className="flex overflow-hidden rounded-lg ring-1 ring-input focus-within:ring-2 focus-within:ring-saffron">
            <span className="grid place-items-center bg-cream px-3 text-sm font-medium text-mute">+91</span>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              className="flex-1 bg-transparent px-3 py-2 text-base outline-none placeholder:text-mute/60"
            />
          </div>
        </div>
        {msg && <p className="text-sm text-rose-600">{msg}</p>}
        <Button type="submit" variant="saffron" disabled={pending} className="h-11 w-full text-base">
          {pending ? "Sending code…" : "Send one-time code"}
        </Button>
      </form>
      <p className="border-t border-ink/5 pt-4 text-center text-xs text-mute">
        Staff sign-in?{" "}
        <Link href="/login" className="font-medium text-saffron hover:underline">Use staff portal</Link>
      </p>
    </div>
  );
}
