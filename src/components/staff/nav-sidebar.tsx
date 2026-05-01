"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/academic-years", label: "Academic years" },
  { href: "/classes", label: "Classes & sections" },
  { href: "/subjects", label: "Subjects" },
  { href: "/students", label: "Students" },
  { href: "/users", label: "Staff users" },
];

export function NavSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 bg-white border-r border-rule p-6 hidden md:block">
      <Logo />
      <nav className="mt-8 space-y-1">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block px-3 py-2 rounded text-sm ${active ? "bg-saffron/10 text-saffron font-medium" : "text-ink hover:bg-cream"}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
