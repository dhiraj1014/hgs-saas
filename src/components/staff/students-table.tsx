import Link from "next/link";

type Row = { id: string; admissionNo: string; firstName: string; lastName: string; sectionName: string | null; className: string | null; status: string };

export function StudentsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="text-mute text-sm">No students yet. Add one or import from Excel.</p>;
  }
  return (
    <table className="w-full text-sm bg-white rounded border border-rule overflow-hidden">
      <thead className="bg-cream text-left">
        <tr>
          <th className="px-4 py-2">Adm. no</th>
          <th className="px-4 py-2">Name</th>
          <th className="px-4 py-2">Class / Section</th>
          <th className="px-4 py-2">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-rule">
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-2 font-mono">{r.admissionNo}</td>
            <td className="px-4 py-2"><Link href={`/students/${r.id}`} className="text-saffron hover:underline">{r.firstName} {r.lastName}</Link></td>
            <td className="px-4 py-2">{r.className ?? "—"} {r.sectionName ? `· ${r.sectionName}` : ""}</td>
            <td className="px-4 py-2 text-mute">{r.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
