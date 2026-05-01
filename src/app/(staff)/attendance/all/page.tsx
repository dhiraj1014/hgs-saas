import { listAttendanceByDate } from "@/server/attendance";

export default async function AllAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date ?? new Date().toISOString().slice(0, 10);
  const rows = await listAttendanceByDate(date);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-serif">All attendance — {date}</h1>
      <form>
        <label className="text-sm">
          Date
          <input type="date" name="date" defaultValue={date} className="border border-rule rounded px-2 py-1 ml-2" />
        </label>
      </form>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-rule">
            <th className="py-2">Adm.</th><th>Name</th><th>Class · Section</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.studentId} className="border-b border-rule/50">
              <td className="py-2">{r.admissionNo}</td>
              <td>{r.firstName} {r.lastName}</td>
              <td>{r.className} · {r.sectionName}</td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
