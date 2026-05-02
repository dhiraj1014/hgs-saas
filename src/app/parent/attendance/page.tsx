import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getLinkedStudents, getChildAttendance } from "@/server/parent-queries";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ParentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; month?: string }>;
}) {
  const params = await searchParams;
  const children = await getLinkedStudents();
  const childId = params.child ?? children[0]?.studentId;

  if (!childId) {
    return (
      <Card className="bg-white">
        <CardContent className="py-8 text-center text-sm text-mute">No children linked.</CardContent>
      </Card>
    );
  }

  const child = children.find((c) => c.studentId === childId)!;
  const today = new Date();
  const month = params.month ?? today.toISOString().slice(0, 7);
  const [y, m] = month.split("-").map(Number) as [number, number];
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0).getDate();
  const start = `${month}-01`;
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  const monthLabel = firstDay.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const leadingBlanks = firstDay.getDay();

  const rows = await getChildAttendance(childId, start, end);
  const byDate = new Map(rows.map((r) => [r.date, r.status]));
  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const late = rows.filter((r) => r.status === "late").length;
  const total = present + absent + late;
  const pct = total === 0 ? null : Math.round((present / total) * 100);

  const childParam = (mm: string) => `?child=${childId}&month=${mm}`;

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-saffron">{child.firstName} {child.lastName}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Attendance</h1>
      </header>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <StatTile label="Present" value={present} tone="emerald" />
        <StatTile label="Absent" value={absent} tone="rose" />
        <StatTile label="Late" value={late} tone="amber" />
        {pct !== null && (
          <StatTile
            label="Attendance"
            value={`${pct}%`}
            tone={pct >= 90 ? "emerald" : pct >= 75 ? "amber" : "rose"}
          />
        )}
      </div>

      <Card className="bg-white">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href={childParam(shiftMonth(month, -1))}
              className="grid size-8 place-items-center rounded-full text-mute transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <p className="font-display text-base font-semibold text-ink">{monthLabel}</p>
            <Link
              href={childParam(shiftMonth(month, 1))}
              className="grid size-8 place-items-center rounded-full text-mute transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {DOW.map((d, i) => (
              <div key={i} className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-mute">{d}</div>
            ))}
            {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} />)}
            {Array.from({ length: lastDay }, (_, i) => {
              const day = String(i + 1).padStart(2, "0");
              const status = byDate.get(`${month}-${day}`);
              return (
                <div
                  key={day}
                  className={cn(
                    "aspect-square rounded-lg border text-[11px] font-medium flex flex-col items-center justify-center gap-0.5 transition-colors",
                    status === "present" && "border-emerald-200 bg-emerald-50 text-emerald-800",
                    status === "absent" && "border-rose-200 bg-rose-50 text-rose-800",
                    status === "late" && "border-amber-200 bg-amber-50 text-amber-800",
                    !status && "border-ink/5 bg-cream text-mute",
                  )}
                >
                  <span>{i + 1}</span>
                  {status && <span className="text-[8px] uppercase tracking-wider">{status[0]}</span>}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-mute">
            <Legend tone="emerald" label="Present" />
            <Legend tone="rose" label="Absent" />
            <Legend tone="amber" label="Late" />
            <Legend tone="cream" label="Not marked" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone: "emerald" | "rose" | "amber" }) {
  const toneClass =
    tone === "emerald" ? "text-emerald-700" :
    tone === "rose" ? "text-rose-700" :
    "text-amber-700";
  return (
    <Card size="sm" className="bg-white">
      <CardContent className="space-y-0.5">
        <p className="text-[10px] uppercase tracking-wider text-mute">{label}</p>
        <p className={cn("font-display text-2xl font-semibold", toneClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Legend({ tone, label }: { tone: "emerald" | "rose" | "amber" | "cream"; label: string }) {
  const swatch =
    tone === "emerald" ? "bg-emerald-100 border-emerald-200" :
    tone === "rose" ? "bg-rose-100 border-rose-200" :
    tone === "amber" ? "bg-amber-100 border-amber-200" :
    "bg-cream border-ink/10";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block size-3 rounded border", swatch)} />
      {label}
    </span>
  );
}
