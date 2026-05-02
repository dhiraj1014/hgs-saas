"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar, Megaphone, MessageSquare, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { LogoMark } from "@/components/shared/logo-mark";
import { ChildSwitcher } from "@/components/parent/child-switcher";
import { cn } from "@/lib/utils";

type Child = { studentId: string; firstName: string; lastName: string; admissionNo: string };

const tabs = [
  { href: "/parent/dashboard", label: "Home", icon: Home },
  { href: "/parent/attendance", label: "Attendance", icon: Calendar },
  { href: "/parent/announcements", label: "Notices", icon: Megaphone },
  { href: "/parent/notifications", label: "Messages", icon: MessageSquare },
] as const;

export function ParentShell({
  students,
  children,
}: {
  students: Child[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 border-b border-ink/5 bg-cream/85 backdrop-blur supports-[backdrop-filter]:bg-cream/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/parent/dashboard" className="flex items-center gap-2.5">
            <LogoMark size="md" />
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-semibold tracking-tight text-ink">HGS</span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-mute">Parent portal</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ChildSwitcher students={students} current={null} />
            <button
              type="button"
              aria-label="Sign out"
              onClick={async () => {
                await signOut();
                router.push("/parent-login");
              }}
              className="grid size-8 cursor-pointer place-items-center rounded-full text-mute transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-3xl items-center gap-1 px-4 pb-2 md:flex">
          {tabs.map((t) => {
            const active = pathname?.startsWith(t.href);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-ink text-cream"
                    : "text-mute hover:bg-ink/5 hover:text-ink",
                )}
              >
                <Icon className="size-3.5" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 md:pb-10">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/5 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
          {tabs.map((t) => {
            const active = pathname?.startsWith(t.href);
            const Icon = t.icon;
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={t.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors",
                    active ? "text-saffron" : "text-mute hover:text-ink",
                  )}
                >
                  <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                  <span className={cn("font-medium", active && "text-ink")}>{t.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
