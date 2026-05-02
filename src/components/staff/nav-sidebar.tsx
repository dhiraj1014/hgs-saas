"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/shared/logo-mark";
import { type Role } from "@/lib/permissions";
import { navForRole, NAV_GROUPS } from "./nav-config";
import { cn } from "@/lib/utils";

export function NavSidebar({
  role,
  collapsed = false,
}: {
  role: Role;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const links = navForRole(role);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-rule bg-white transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <Link
        href="/dashboard"
        className={cn(
          "flex h-16 shrink-0 items-center gap-2.5 border-b border-rule",
          collapsed ? "justify-center px-2" : "px-5",
        )}
      >
        <LogoMark size="md" />
        {!collapsed && (
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-semibold tracking-tight text-ink">
              HGS
            </span>
            <span className="block text-[10px] uppercase tracking-[0.16em] text-mute">
              Staff console
            </span>
          </span>
        )}
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((g) => {
          const items = links.filter((l) => l.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g} className="mb-5">
              {!collapsed && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
                  {g}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((l) => {
                  const active =
                    pathname === l.href || pathname.startsWith(l.href + "/");
                  const Icon = l.icon;
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        title={collapsed ? l.label : undefined}
                        aria-label={collapsed ? l.label : undefined}
                        className={cn(
                          "group flex items-center rounded-lg text-sm transition-colors",
                          collapsed
                            ? "h-10 justify-center"
                            : "gap-2.5 px-3 py-2",
                          active
                            ? "bg-saffron/10 font-medium text-[#B26116]"
                            : "text-ink/80 hover:bg-cream hover:text-ink",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            active
                              ? "text-[#B26116]"
                              : "text-mute group-hover:text-ink",
                          )}
                        />
                        {!collapsed && <span className="truncate">{l.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="border-t border-rule px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-mute">
          Byapur, Patna
        </div>
      )}
    </aside>
  );
}
