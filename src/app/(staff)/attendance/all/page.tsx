import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { listAttendanceByDate } from "@/server/attendance";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  present: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  absent: "bg-rose-50 text-rose-700 ring-rose-100",
  late: "bg-amber-50 text-amber-700 ring-amber-100",
};

export default async function AllAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date ?? new Date().toISOString().slice(0, 10);
  const rows = await listAttendanceByDate(date);

  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const late = rows.filter((r) => r.status === "late").length;

  const friendly = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="All sections"
        description={friendly}
      />

      <Card className="bg-white">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <form className="flex items-end gap-2">
            <label className="space-y-1 text-xs">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-mute">Date</span>
              <input
                type="date"
                name="date"
                defaultValue={date}
                className="rounded-lg border border-rule bg-white px-3 py-1.5 text-sm focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron-wash"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-cream transition-colors hover:bg-[#B26116]"
            >
              Apply
            </button>
          </form>
          {rows.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <Stat label="Present" value={present} tone="emerald" />
              <Stat label="Absent" value={absent} tone="rose" />
              <Stat label="Late" value={late} tone="amber" />
            </div>
          )}
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="space-y-3 py-12 text-center">
            <CalendarCheck className="mx-auto size-8 text-mute" />
            <div>
              <p className="text-sm font-medium text-ink">No attendance recorded for {friendly}.</p>
              <p className="mt-1 text-sm text-mute">
                Pick a different date above, or{" "}
                <Link href="/attendance" className="font-medium text-[#B26116] hover:underline">mark attendance for a section</Link>.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-rule bg-white">
          <div className="rounded-2xl">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-cream/95 shadow-[0_1px_0_var(--color-rule)] backdrop-blur supports-[backdrop-filter]:bg-cream/80">
                <tr className="text-left text-[11px] uppercase tracking-wider text-mute">
                  <th className="px-4 py-3 font-semibold first:rounded-tl-2xl">Adm.</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Class · Section</th>
                  <th className="px-4 py-3 font-semibold last:rounded-tr-2xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {rows.map((r) => (
                  <tr key={r.studentId} className="transition-colors hover:bg-cream/40">
                    <td className="px-4 py-3 font-mono text-xs text-mute">{r.admissionNo}</td>
                    <td className="px-4 py-3 font-medium text-ink">{r.firstName} {r.lastName}</td>
                    <td className="px-4 py-3 text-mute">{r.className} · {r.sectionName}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                        STATUS_TONE[r.status] ?? "bg-ink/5 text-mute ring-rule",
                      )}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "rose" | "amber" }) {
  const toneClass =
    tone === "emerald" ? "text-emerald-700" :
    tone === "rose" ? "text-rose-700" :
    "text-amber-700";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1">
      <span className={cn("font-display text-sm font-semibold", toneClass)}>{value}</span>
      <span className="text-[11px] uppercase tracking-wider text-mute">{label}</span>
    </span>
  );
}
