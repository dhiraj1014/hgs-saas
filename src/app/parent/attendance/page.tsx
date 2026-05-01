import { getLinkedStudents, getChildAttendance } from "@/server/parent";

export default async function ParentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; month?: string }>;
}) {
  const params = await searchParams;
  const children = await getLinkedStudents();
  const childId = params.child ?? children[0]?.studentId;
  if (!childId) return <p className="text-sm text-mute">No children linked.</p>;
  const today = new Date();
  const month = params.month ?? today.toISOString().slice(0, 7);   // YYYY-MM
  const start = `${month}-01`;
  const [y, m] = month.split("-");
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  const rows = await getChildAttendance(childId, start, end);
  const byDate = new Map(rows.map((r) => [r.date, r.status]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-serif">Attendance — {month}</h1>
      <div className="grid grid-cols-7 gap-2 text-center text-xs">
        {Array.from({ length: lastDay }, (_, i) => {
          const day = String(i + 1).padStart(2, "0");
          const status = byDate.get(`${month}-${day}`);
          const cls =
            status === "present" ? "bg-green-100" :
            status === "absent" ? "bg-red-100" :
            status === "late" ? "bg-yellow-100" : "bg-cream";
          return (
            <div key={day} className={`p-2 rounded ${cls}`}>
              <div>{day}</div>
              <div className="text-[10px] uppercase text-mute">{status ?? ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
