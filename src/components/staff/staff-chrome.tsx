"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/permissions";
import { NavSidebar } from "./nav-sidebar";
import { Header } from "./header";
import { Toaster } from "@/components/ui/sonner";

const COLLAPSED_KEY = "hgs:sidebar-collapsed";

export function StaffChrome({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved === "true") setCollapsed(true);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Wait until we've read localStorage before rendering the collapsed state, so
  // SSR markup matches the first paint and avoids a layout flash on hydration.
  const effective = hydrated && collapsed;

  return (
    <div className="flex h-screen bg-cream">
      <NavSidebar role={role} collapsed={effective} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={role} collapsed={effective} onToggleCollapsed={toggle} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
