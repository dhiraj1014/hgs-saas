"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <div className="max-w-sm mx-auto py-12 space-y-6">
      <h1 className="text-2xl font-serif">Parent login</h1>
      <p className="text-sm text-mute">Enter the mobile number registered with the school. We&apos;ll send you a one-time code.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex">
          <span className="border border-rule rounded-l px-3 py-2 bg-cream text-sm">+91</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric"
            className="flex-1 border-y border-r border-rule rounded-r px-3 py-2" placeholder="10-digit number" />
        </div>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Sending…" : "Send code"}
        </Button>
      </form>
    </div>
  );
}
