import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getLinkedStudents } from "@/server/parent";
import { ChildSwitcher } from "@/components/parent/child-switcher";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/parent-login");
  const role = (session.user as { role?: string }).role;
  if (role !== "parent") redirect("/dashboard");

  const students = await getLinkedStudents();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-rule px-4 py-3 flex items-center gap-4">
        <span className="font-serif text-lg">HGS</span>
        <nav className="flex gap-3 text-sm">
          <Link href="/parent/dashboard">Home</Link>
          <Link href="/parent/attendance">Attendance</Link>
          <Link href="/parent/announcements">Announcements</Link>
          <Link href="/parent/notifications">Messages</Link>
        </nav>
        <div className="ml-auto">
          <ChildSwitcher children={students} current={null} />
        </div>
      </header>
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">{children}</main>
    </div>
  );
}
