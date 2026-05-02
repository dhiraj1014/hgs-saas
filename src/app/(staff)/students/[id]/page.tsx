import { notFound } from "next/navigation";
import { getStudent } from "@/server/students";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-ink/5 text-mute ring-rule",
  graduated: "bg-sky-50 text-sky-700 ring-sky-200",
  withdrawn: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data;
  try {
    data = await getStudent(id);
  } catch {
    notFound();
  }

  const fullName = `${data.student.firstName} ${data.student.lastName}`;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Breadcrumbs
          items={[
            { label: "Students", href: "/students" },
            { label: fullName },
          ]}
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
              {fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-mute">
              <span className="font-mono">{data.student.admissionNo}</span>
              {data.className && (
                <span>
                  <span className="text-ink">{data.className}</span>
                  {data.sectionName && <span className="ml-1">· Sec {data.sectionName}</span>}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                  STATUS_TONE[data.student.status] ?? "bg-ink/5 text-mute ring-rule",
                )}
              >
                {data.student.status}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-rule bg-white p-6">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">
          Profile
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
          <Detail label="Admission no" value={data.student.admissionNo} mono />
          <Detail
            label="Class / Section"
            value={
              data.className
                ? `${data.className}${data.sectionName ? ` · ${data.sectionName}` : ""}`
                : "—"
            }
          />
          <Detail label="Date of birth" value={data.student.dob ?? "—"} />
          <Detail label="Gender" value={data.student.gender ?? "—"} />
          <Detail label="Blood group" value={data.student.bloodGroup ?? "—"} />
          <Detail label="Status" value={data.student.status} />
          <Detail label="Address" value={data.student.address ?? "—"} full />
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">
          Parents / Guardians
        </h2>
        {data.parents.length === 0 ? (
          <div className="rounded-2xl border border-rule bg-white px-5 py-6 text-center text-sm text-mute">
            No parents on file.
          </div>
        ) : (
          <ul className="divide-y divide-rule rounded-2xl border border-rule bg-white">
            {data.parents.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-medium text-ink">
                    {p.fullName}
                    {p.isPrimary && (
                      <span className="ml-2 rounded-full bg-saffron/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#B26116]">
                        Primary
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-mute">
                    {p.relation ?? "—"}
                  </p>
                </div>
                <p className="font-mono text-xs text-mute">{p.phone}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">
        {label}
      </dt>
      <dd className={cn("mt-1.5 text-ink", mono && "font-mono text-sm")}>{value}</dd>
    </div>
  );
}
