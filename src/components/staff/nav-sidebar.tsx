"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/shared/logo-mark";
import { type Role } from "@/lib/permissions";
import { navForRole, NAV_GROUPS } from "./nav-config";
import { cn } from "@/lib/utils";

export function NavSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = navForRole(role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-rule bg-white md:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 border-b border-rule px-5 py-4">
        <LogoMark size="md" />
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-semibold tracking-tight text-ink">HGS</span>
          <span className="block text-[10px] uppercase tracking-[0.16em] text-mute">Staff console</span>
        </span>
      </Link>
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
                          "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-saffron/10 font-medium text-[#B26116]"
                            : "text-ink/80 hover:bg-cream hover:text-ink",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
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
      <div className="border-t border-rule px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-mute">
        Byapur, Patna
      </div>
    </aside>
  );
}
