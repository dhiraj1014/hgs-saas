"use client";

import { useState, useTransition } from "react";
import { Check, X, Circle, ListChecks, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { submitAttendance } from "@/server/attendance";
import { cn } from "@/lib/utils";

type StudentRow = { id: string; admissionNo: string; firstName: string; lastName: string; status: string | null };
type Status = "present" | "absent" | "late";

const OPTIONS: { value: Status; label: string; Icon: typeof Check; activeClass: string }[] = [
  { value: "present", label: "Present", Icon: Check, activeClass: "bg-emerald-500 text-white ring-emerald-500" },
  { value: "absent", label: "Absent", Icon: X, activeClass: "bg-rose-500 text-white ring-rose-500" },
  { value: "late", label: "Late", Icon: Circle, activeClass: "bg-amber-500 text-white ring-amber-500" },
];

export function AttendanceGrid({
  sectionId,
  date,
  students,
  sectionLabel,
}: {
  sectionId: string;
  date: string;
  students: StudentRow[];
  sectionLabel?: string;
}) {
  const [rows, setRows] = useState<Record<string, Status>>(
    Object.fromEntries(students.map((s) => [s.id, (s.status as Status) ?? "present"])),
  );
  const [pending, startTransition] = useTransition();

  function setStatus(id: string, status: Status) {
    setRows((r) => ({ ...r, [id]: status }));
  }

  function markAllPresent() {
    setRows(Object.fromEntries(students.map((s) => [s.id, "present" as Status])));
  }

  function handleSubmit() {
    const entries = Object.entries(rows).map(([studentId, status]) => ({ studentId, status }));
    startTransition(async () => {
      try {
        const result = await submitAttendance({ sectionId, date, entries });
        const parts: string[] = [];
        parts.push(`Marked ${result.marked}`);
        if (result.notified > 0) parts.push(`notified ${result.notified}`);
        if (result.failed > 0) parts.push(`${result.failed} failed`);
        if (result.skipped > 0) parts.push(`${result.skipped} skipped (no parent phone)`);
        toast.success("Attendance saved", { description: parts.join(" · ") });
      } catch (e) {
        toast.error("Save failed", {
          description: e instanceof Error ? e.message : "Please try again.",
        });
      }
    });
  }

  if (students.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="py-10 text-center text-sm text-mute">
          No students in this section yet.
        </CardContent>
      </Card>
    );
  }

  const counts = students.reduce(
    (acc, s) => {
      const status = rows[s.id] ?? "present";
      acc[status]++;
      return acc;
    },
    { present: 0, absent: 0, late: 0 } as Record<Status, number>,
  );

  return (
    <Card className="bg-white p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B26116]">
            {sectionLabel ?? "Roster"}
          </p>
          <p className="font-display text-base font-semibold text-ink">
            {students.length} student{students.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CountChip label="Present" value={counts.present} tone="emerald" />
          <CountChip label="Absent" value={counts.absent} tone="rose" />
          <CountChip label="Late" value={counts.late} tone="amber" />
        </div>
      </div>

      <ul role="list" className="divide-y divide-rule">
        {students.map((s, i) => {
          const current = rows[s.id] ?? "present";
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-cream font-mono text-xs font-semibold text-mute">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-medium text-ink">{s.firstName} {s.lastName}</p>
                  <p className="truncate font-mono text-[11px] text-mute">{s.admissionNo}</p>
                </div>
              </div>
              <StatusGroup
                value={current}
                onChange={(v) => setStatus(s.id, v)}
              />
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-cream/40 px-5 py-3">
        <Button variant="ghost" size="sm" onClick={markAllPresent} disabled={pending}>
          <ListChecks className="size-3.5" /> Mark all present
        </Button>
        <Button variant="saffron" size="sm" onClick={handleSubmit} disabled={pending} className="h-9 px-4">
          <Save className="size-3.5" /> {pending ? "Saving…" : "Save attendance"}
        </Button>
      </div>
    </Card>
  );
}

function StatusGroup({
  value,
  onChange,
}: {
  value: Status;
  onChange: (v: Status) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Attendance status" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-cream p-1">
      {OPTIONS.map(({ value: v, label, Icon, activeClass }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-medium ring-1 ring-transparent transition-all sm:px-4",
              active ? activeClass : "text-mute hover:bg-white hover:text-ink",
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CountChip({ label, value, tone }: { label: string; value: number; tone: "emerald" | "rose" | "amber" }) {
  const toneClass =
    tone === "emerald" ? "text-emerald-700 bg-emerald-50 ring-emerald-100" :
    tone === "rose" ? "text-rose-700 bg-rose-50 ring-rose-100" :
    "text-amber-700 bg-amber-50 ring-amber-100";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset", toneClass)}>
      <span className="font-display text-sm font-semibold">{value}</span>
      <span className="uppercase tracking-wider opacity-80">{label}</span>
    </span>
  );
}
