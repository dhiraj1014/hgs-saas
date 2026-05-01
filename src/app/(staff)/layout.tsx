import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavSidebar } from "@/components/staff/nav-sidebar";
import { Header } from "@/components/staff/header";
import type { Role } from "@/lib/permissions";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role as Role | undefined;
  if (!role || role === "parent") redirect("/login");

  return (
    <div className="flex h-screen">
      <NavSidebar role={role} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
