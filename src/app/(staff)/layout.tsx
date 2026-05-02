import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StaffChrome } from "@/components/staff/staff-chrome";
import type { Role } from "@/lib/permissions";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role as Role | undefined;
  if (!role || role === "parent") redirect("/login");

  return <StaffChrome role={role}>{children}</StaffChrome>;
}
