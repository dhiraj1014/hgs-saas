"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn.email({ email, password });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Invalid credentials");
      return;
    }
    router.push(from);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Staff sign-in</h1>
        <p className="text-sm text-mute">Use your school email and password.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" variant="saffron" disabled={loading} className="h-11 w-full text-base">
        {loading ? "Signing in..." : "Sign in"}
      </Button>
      <p className="border-t border-ink/5 pt-4 text-center text-xs text-mute">
        Are you a parent?{" "}
        <Link href="/parent-login" className="font-medium text-saffron hover:underline">Use parent portal</Link>
      </p>
    </form>
  );
}
