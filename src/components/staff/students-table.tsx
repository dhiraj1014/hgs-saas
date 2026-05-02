"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SortableTh, type SortDir } from "@/components/ui/sortable-th";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  sectionName: string | null;
  className: string | null;
  status: string;
};

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-ink/5 text-mute ring-rule",
  graduated: "bg-sky-50 text-sky-700 ring-sky-200",
  withdrawn: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function StudentsTable({
  rows,
  sortKey,
  sortDir,
  searchParams,
  hasActiveFilter,
}: {
  rows: Row[];
  sortKey: string | undefined;
  sortDir: SortDir | undefined;
  searchParams: Record<string, string | undefined>;
  hasActiveFilter: boolean;
}) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="py-10 text-center">
          <Users className="mx-auto mb-3 size-7 text-mute" />
          <p className="text-sm font-medium text-ink">
            {hasActiveFilter ? "No matching students" : "No students yet"}
          </p>
          <p className="mt-1 text-sm text-mute">
            {hasActiveFilter
              ? "Try a different search or clear the filters."
              : "Add a student or import a roster from Excel to get started."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-2xl border border-rule bg-white">
      <div className="rounded-2xl">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-cream/95 shadow-[0_1px_0_var(--color-rule)] backdrop-blur supports-[backdrop-filter]:bg-cream/80">
            <tr className="text-left text-[11px] uppercase tracking-wider text-mute">
              <SortableTh
                label="Adm. no"
                sortKey="admissionNo"
                currentKey={sortKey}
                currentDir={sortDir}
                basePath="/students"
                searchParams={searchParams}
                className="first:rounded-tl-2xl"
              />
              <SortableTh
                label="Name"
                sortKey="firstName"
                currentKey={sortKey}
                currentDir={sortDir}
                basePath="/students"
                searchParams={searchParams}
              />
              <th className="px-4 py-3 font-semibold">Class · Section</th>
              <SortableTh
                label="Status"
                sortKey="status"
                currentKey={sortKey}
                currentDir={sortDir}
                basePath="/students"
                searchParams={searchParams}
              />
              <th className="w-10 px-2 py-3 last:rounded-tr-2xl"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((r) => {
              const href = `/students/${r.id}`;
              return (
                <tr
                  key={r.id}
                  onClick={() => router.push(href)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(href);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`View ${r.firstName} ${r.lastName}`}
                  className="group cursor-pointer transition-colors hover:bg-cream/40 focus:bg-cream/40 focus:outline-none"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-mute">
                    {r.admissionNo}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink group-hover:text-[#B26116]">
                    {r.firstName} {r.lastName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-mute">
                    {r.className ? (
                      <>
                        <span className="text-ink">{r.className}</span>
                        {r.sectionName && (
                          <span className="ml-1 text-mute">· Sec {r.sectionName}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-mute/60">— Unassigned —</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                        STATUS_TONE[r.status] ?? "bg-ink/5 text-mute ring-rule",
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="w-10 px-2 py-3 text-right">
                    <ChevronRight className="ml-auto size-4 text-mute/60 transition-colors group-hover:text-[#B26116]" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
