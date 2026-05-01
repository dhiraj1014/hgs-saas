import Link from "next/link";
import { getLinkedStudents } from "@/server/parent";

export default async function ParentDashboard() {
  const children = await getLinkedStudents();
  if (children.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-serif">Welcome</h1>
        <p className="text-sm text-mute">Your account isn&apos;t linked to any students yet. Please contact the school office.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif">Welcome</h1>
      <ul className="space-y-3">
        {children.map((c) => (
          <li key={c.studentId} className="border border-rule rounded p-4">
            <p className="font-medium">{c.firstName} {c.lastName}</p>
            <p className="text-sm text-mute">{c.admissionNo} · {c.className} · {c.sectionName}</p>
            <div className="mt-3 flex gap-3 text-sm">
              <Link href={`/parent/attendance?child=${c.studentId}`} className="underline">Attendance</Link>
              <Link href={`/parent/announcements?child=${c.studentId}`} className="underline">Announcements</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
