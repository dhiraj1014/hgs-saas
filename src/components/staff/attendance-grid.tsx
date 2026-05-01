"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitAttendance } from "@/server/attendance";

type StudentRow = { id: string; admissionNo: string; firstName: string; lastName: string; status: string | null };
type Status = "present" | "absent" | "late";

export function AttendanceGrid({ sectionId, date, students }: { sectionId: string; date: string; students: StudentRow[] }) {
  const [rows, setRows] = useState<Record<string, Status>>(
    Object.fromEntries(students.map((s) => [s.id, (s.status as Status) ?? "present"])),
  );
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function setStatus(id: string, status: Status) {
    setRows((r) => ({ ...r, [id]: status }));
  }

  function handleSubmit() {
    const entries = Object.entries(rows).map(([studentId, status]) => ({ studentId, status }));
    startTransition(async () => {
      try {
        const result = await submitAttendance({ sectionId, date, entries });
        const parts = [`Marked ${result.marked}`];
        if (result.notified > 0) parts.push(`notified ${result.notified}`);
        if (result.failed > 0) parts.push(`${result.failed} failed`);
        if (result.skipped > 0) parts.push(`${result.skipped} skipped (no parent phone)`);
        setToast(parts.join(", "));
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-sm border-b border-rule">
            <th className="py-2 pr-4">Adm. No.</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b border-rule/50">
              <td className="py-2 pr-4 text-sm">{s.admissionNo}</td>
              <td className="py-2 pr-4 text-sm">{s.firstName} {s.lastName}</td>
              <td className="py-2">
                {(["present", "absent", "late"] as Status[]).map((opt) => (
                  <label key={opt} className="inline-flex items-center mr-4 text-sm">
                    <input
                      type="radio"
                      name={`s-${s.id}`}
                      checked={rows[s.id] === opt}
                      onChange={() => setStatus(s.id, opt)}
                      className="mr-1"
                    />
                    {opt}
                  </label>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-4">
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Saving…" : "Save attendance"}
        </Button>
        {toast && <span className="text-sm text-mute">{toast}</span>}
      </div>
    </div>
  );
}
