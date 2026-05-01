// src/app/(staff)/attendance/page.tsx
import Link from "next/link";
import { getAssignedSections, getSectionAttendance } from "@/server/attendance";
import { AttendanceGrid } from "@/components/staff/attendance-grid";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; date?: string }>;
}) {
  const params = await searchParams;
  const sections = await getAssignedSections();
  const today = new Date().toISOString().slice(0, 10);
  const sectionId = params.section ?? sections[0]?.id;
  const date = params.date ?? today;

  if (!sections.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-serif mb-4">Attendance</h1>
        <p className="text-mute">No sections assigned to you for the current academic year.</p>
      </div>
    );
  }

  const students = sectionId ? await getSectionAttendance(sectionId, date) : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-serif">Attendance</h1>
      <form className="flex gap-4 items-end">
        <label className="flex flex-col text-sm">
          Section
          <select name="section" defaultValue={sectionId} className="border border-rule rounded px-2 py-1">
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.className} · {s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Date
          <input type="date" name="date" defaultValue={date} className="border border-rule rounded px-2 py-1" />
        </label>
        <button type="submit" className="border border-rule rounded px-3 py-1 text-sm">Load</button>
        <Link href="/attendance/all" className="ml-auto text-sm underline">Cross-section view</Link>
      </form>
      {sectionId && (
        <AttendanceGrid sectionId={sectionId} date={date} students={students} />
      )}
    </div>
  );
}
