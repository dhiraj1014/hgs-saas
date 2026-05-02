import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { listStudents } from "@/server/students";
import { StudentsTable } from "@/components/staff/students-table";
import { PageHeader } from "@/components/shared/page-header";

export default async function StudentsPage() {
  const rows = await listStudents();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Roster"
        title="Students"
        description={`${rows.length} student${rows.length === 1 ? "" : "s"} on record.`}
        action={
          <>
            <Link
              href="/students/import"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream"
            >
              <Upload className="size-3.5" /> Import from Excel
            </Link>
            <Link
              href="/students/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-saffron px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-[#B26116] hover:text-white"
            >
              <Plus className="size-3.5" /> New student
            </Link>
          </>
        }
      />
      <StudentsTable rows={rows} />
    </div>
  );
}
