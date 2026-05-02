"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/logo-mark";
import { type Role } from "@/lib/permissions";
import { navForRole, NAV_GROUPS } from "./nav-config";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  principal: "Principal",
  class_teacher: "Class teacher",
  staff: "Staff",
  parent: "Parent",
};

export function Header({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useSession();
  const [open, setOpen] = useState(false);

  const email = data?.user?.email ?? "";
  const sessionRole = (data?.user as { role?: string } | undefined)?.role ?? role;
  const initial = (data?.user?.name ?? email).charAt(0).toUpperCase();

  // Close drawer on route change. Setting state in this effect is the
  // intended pattern (sync with navigation), so silence the lint rule.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setOpen((o) => (o ? false : o));
  }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-rule bg-white px-4 md:px-6">
        <div className={cn("flex items-center gap-3", open && "md:flex hidden")}>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="grid size-9 cursor-pointer place-items-center rounded-lg text-ink transition-colors hover:bg-cream md:hidden"
          >
            <Menu className="size-5" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <LogoMark size="sm" />
            <span className="font-display text-sm font-semibold tracking-tight text-ink">HGS</span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <span className="grid size-8 place-items-center rounded-full bg-saffron/10 font-display text-sm font-semibold text-[#B26116]">
              {initial}
            </span>
            <div className="leading-tight">
              <span className="block text-sm font-medium text-ink">{email}</span>
              {sessionRole && (
                <span className="block text-[11px] uppercase tracking-wider text-mute">
                  {ROLE_LABEL[sessionRole] ?? sessionRole}
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
        >
          <LogOut className="size-3.5" /> Sign out
        </Button>
      </header>

      <MobileDrawer open={open} role={role} email={email} initial={initial} onClose={() => setOpen(false)} />
    </>
  );
}

function MobileDrawer({
  open,
  role,
  email,
  initial,
  onClose,
}: {
  open: boolean;
  role: Role;
  email: string;
  initial: string;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const links = navForRole(role);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink/55 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-rule bg-white shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <LogoMark size="md" />
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-semibold tracking-tight text-ink">HGS</span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-mute">Staff console</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="grid size-8 cursor-pointer place-items-center rounded-full text-mute transition-colors hover:bg-cream hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((g) => {
            const items = links.filter((l) => l.group === g);
            if (items.length === 0) return null;
            return (
              <div key={g} className="mb-5">
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">{g}</p>
                <ul className="space-y-0.5">
                  {items.map((l) => {
                    const active = pathname === l.href || pathname.startsWith(l.href + "/");
                    const Icon = l.icon;
                    return (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                            active
                              ? "bg-saffron/10 font-medium text-[#B26116]"
                              : "text-ink/80 hover:bg-cream hover:text-ink",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4 shrink-0",
                              active ? "text-[#B26116]" : "text-mute group-hover:text-ink",
                            )}
                          />
                          <span className="truncate">{l.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-rule px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-saffron/10 font-display text-sm font-semibold text-[#B26116]">
              {initial}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-medium text-ink">{email}</span>
              <span className="block text-[11px] uppercase tracking-wider text-mute">
                {ROLE_LABEL[role] ?? role}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
