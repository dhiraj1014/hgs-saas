import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getLinkedStudents } from "@/server/parent-queries";
import { ParentShell } from "@/components/parent/parent-shell";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/parent-login");
  const role = (session.user as { role?: string }).role;
  if (role !== "parent") redirect("/dashboard");

  const students = await getLinkedStudents();

  return <ParentShell students={students}>{children}</ParentShell>;
}
