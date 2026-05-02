import {
  LayoutDashboard,
  CalendarCheck,
  Megaphone,
  BellRing,
  CalendarRange,
  Layers,
  BookOpen,
  Users,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { can, type Ability, type Role } from "@/lib/permissions";

export type NavGroup = "Today" | "Manage";
export type NavItem = {
  href: string;
  label: string;
  ability?: Ability;
  icon: LucideIcon;
  group: NavGroup;
};

export const STAFF_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Today" },
  { href: "/attendance", label: "Attendance", ability: "attendance.mark", icon: CalendarCheck, group: "Today" },
  { href: "/announcements", label: "Announcements", ability: "announcements.view", icon: Megaphone, group: "Today" },
  { href: "/notifications", label: "Notifications log", ability: "notifications.view-all", icon: BellRing, group: "Today" },
  { href: "/academic-years", label: "Academic years", ability: "academic-years.manage", icon: CalendarRange, group: "Manage" },
  { href: "/classes", label: "Classes & sections", ability: "classes.manage", icon: Layers, group: "Manage" },
  { href: "/subjects", label: "Subjects", ability: "subjects.manage", icon: BookOpen, group: "Manage" },
  { href: "/students", label: "Students", ability: "students.view", icon: Users, group: "Manage" },
  { href: "/users", label: "Staff users", ability: "users.manage", icon: UserCog, group: "Manage" },
];

export const NAV_GROUPS: NavGroup[] = ["Today", "Manage"];

export function navForRole(role: Role): NavItem[] {
  return STAFF_NAV.filter((l) => !l.ability || can(role, l.ability));
}
