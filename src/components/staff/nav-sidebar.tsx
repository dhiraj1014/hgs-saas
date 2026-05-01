"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { can, type Ability, type Role } from "@/lib/permissions";

type NavItem = { href: string; label: string; ability?: Ability };

const ALL_LINKS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/attendance", label: "Attendance", ability: "attendance.mark" },
  { href: "/announcements", label: "Announcements", ability: "announcements.send" },
  { href: "/notifications", label: "Notifications log", ability: "notifications.view-all" },
  { href: "/academic-years", label: "Academic years", ability: "academic-years.manage" },
  { href: "/classes", label: "Classes & sections", ability: "classes.manage" },
  { href: "/subjects", label: "Subjects", ability: "subjects.manage" },
  { href: "/students", label: "Students", ability: "students.view" },
  { href: "/users", label: "Staff users", ability: "users.manage" },
];

export function NavSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = ALL_LINKS.filter((l) => !l.ability || can(role, l.ability));
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
