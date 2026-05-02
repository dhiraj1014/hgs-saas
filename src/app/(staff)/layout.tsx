import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavSidebar } from "@/components/staff/nav-sidebar";
import { Header } from "@/components/staff/header";
import { Toaster } from "@/components/ui/sonner";
import type { Role } from "@/lib/permissions";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role as Role | undefined;
  if (!role || role === "parent") redirect("/login");

  return (
    <div className="flex h-screen bg-cream">
      <NavSidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header role={role} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
