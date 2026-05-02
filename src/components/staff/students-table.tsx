import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

export function StudentsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="py-10 text-center">
          <Users className="mx-auto mb-3 size-7 text-mute" />
          <p className="text-sm font-medium text-ink">No students yet</p>
          <p className="mt-1 text-sm text-mute">
            Add a student or import a roster from Excel to get started.
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
              <th className="px-4 py-3 font-semibold first:rounded-tl-2xl">Adm. no</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Class · Section</th>
              <th className="px-4 py-3 font-semibold last:rounded-tr-2xl">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-cream/40">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-mute">
                  {r.admissionNo}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/students/${r.id}`}
                    className="font-medium text-ink transition-colors hover:text-[#B26116] hover:underline underline-offset-2"
                  >
                    {r.firstName} {r.lastName}
                  </Link>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
