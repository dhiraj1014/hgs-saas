"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function Header() {
  const router = useRouter();
  const { data } = useSession();
  return (
    <header className="h-14 border-b border-rule px-6 flex items-center justify-between bg-white">
      <span className="text-sm text-mute">{data?.user?.email}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await signOut();
          router.push("/login");
        }}
      >
        Sign out
      </Button>
    </header>
  );
}
