import { notFound } from "next/navigation";
import { getStudent } from "@/server/students";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try { data = await getStudent(id); } catch { notFound(); }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-semibold text-ink">
        {data.student.firstName} {data.student.lastName}
      </h1>
      <dl className="grid grid-cols-2 gap-4 text-sm bg-white border border-rule rounded p-4">
        <div><dt className="text-mute">Admission no</dt><dd className="font-mono">{data.student.admissionNo}</dd></div>
        <div><dt className="text-mute">Class / Section</dt><dd>{data.className ?? "—"} {data.sectionName ? `· ${data.sectionName}` : ""}</dd></div>
        <div><dt className="text-mute">Date of birth</dt><dd>{data.student.dob ?? "—"}</dd></div>
        <div><dt className="text-mute">Gender</dt><dd>{data.student.gender ?? "—"}</dd></div>
        <div><dt className="text-mute">Blood group</dt><dd>{data.student.bloodGroup ?? "—"}</dd></div>
        <div><dt className="text-mute">Status</dt><dd>{data.student.status}</dd></div>
        <div className="col-span-2"><dt className="text-mute">Address</dt><dd>{data.student.address ?? "—"}</dd></div>
      </dl>

      <section>
        <h2 className="font-display font-semibold mb-2">Parents / Guardians</h2>
        <ul className="bg-white border border-rule rounded divide-y divide-rule">
          {data.parents.map((p) => (
            <li key={p.id} className="px-4 py-2 text-sm flex justify-between">
              <span>{p.fullName} <span className="text-mute">({p.relation ?? "—"})</span></span>
              <span className="text-mute">{p.phone}{p.isPrimary ? " · primary" : ""}</span>
            </li>
          ))}
          {data.parents.length === 0 && <li className="px-4 py-2 text-sm text-mute">No parents on file.</li>}
        </ul>
      </section>
    </div>
  );
}
