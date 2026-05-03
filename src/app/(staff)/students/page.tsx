import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { listStudents, listSectionsForFilter, type StudentSortKey, type StudentStatus } from "@/server/students";
import { STUDENTS_DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { StudentsTable } from "@/components/staff/students-table";
import { StudentsToolbar } from "@/components/staff/students-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import {
  HEADER_ACTION_PRIMARY,
  HEADER_ACTION_SECONDARY,
  HeaderActionsRow,
} from "@/components/shared/header-actions";
import { TablePagination } from "@/components/ui/table-pagination";
import type { SortDir } from "@/components/ui/sortable-th";

const VALID_SORT: Record<string, StudentSortKey> = {
  admissionNo: "admissionNo",
  firstName: "firstName",
  status: "status",
};

const VALID_STATUS: Record<string, StudentStatus> = {
  active: "active",
  left: "left",
  graduated: "graduated",
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const sectionId = params.section ?? "";
  const status = params.status ?? "";
  const statusFilter = params.status ? VALID_STATUS[params.status] : undefined;
  const sort = params.sort ? VALID_SORT[params.sort] : undefined;
  const dir: SortDir | undefined = params.dir === "desc" ? "desc" : params.dir === "asc" ? "asc" : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ rows, total }, sections] = await Promise.all([
    listStudents({
      q: q || undefined,
      sectionId: sectionId || undefined,
      status: statusFilter,
      sort,
      dir,
      page,
      size: STUDENTS_DEFAULT_PAGE_SIZE,
    }),
    listSectionsForFilter(),
  ]);

  const hasActiveFilter = !!(q || sectionId || status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Roster"
        title="Students"
        description={`${total} student${total === 1 ? "" : "s"}${hasActiveFilter ? " matching" : ""}.`}
        action={
          <HeaderActionsRow>
            <Link href="/students/import" className={HEADER_ACTION_SECONDARY}>
              <Upload className="size-3.5" /> Import from Excel
            </Link>
            <Link href="/students/new" className={HEADER_ACTION_PRIMARY}>
              <Plus className="size-3.5" /> New student
            </Link>
          </HeaderActionsRow>
        }
      />

      <StudentsToolbar
        sections={sections}
        initialQ={q}
        initialSection={sectionId}
        initialStatus={status}
      />

      <StudentsTable
        rows={rows}
        sortKey={sort}
        sortDir={dir}
        searchParams={params}
        hasActiveFilter={hasActiveFilter}
      />

      <TablePagination
        total={total}
        page={page}
        size={STUDENTS_DEFAULT_PAGE_SIZE}
        basePath="/students"
        searchParams={params}
      />
    </div>
  );
}
