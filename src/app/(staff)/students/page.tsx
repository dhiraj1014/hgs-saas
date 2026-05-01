import Link from "next/link";
import { listStudents } from "@/server/students";
import { StudentsTable } from "@/components/staff/students-table";
import { Button } from "@/components/ui/button";

export default async function StudentsPage() {
  const rows = await listStudents();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-ink">Students</h1>
        <div className="flex gap-2">
          <Link href="/students/import"><Button variant="outline">Import from Excel</Button></Link>
          <Link href="/students/new"><Button>New student</Button></Link>
        </div>
      </div>
      <StudentsTable rows={rows} />
    </div>
  );
}
