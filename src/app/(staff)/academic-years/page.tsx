import { listAcademicYears, setCurrentAcademicYear } from "@/server/academic-years";
import { AcademicYearForm } from "@/components/staff/academic-year-form";
import { Button } from "@/components/ui/button";

export default async function AcademicYearsPage() {
  const years = await listAcademicYears();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink">Academic years</h1>
        <p className="text-mute mt-1 text-sm">Set the active session.</p>
      </div>

      <ul className="divide-y divide-rule rounded border border-rule bg-white">
        {years.map((y) => (
          <li key={y.id} className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-medium">{y.name}</span>{" "}
              <span className="text-mute text-sm">{y.startDate} → {y.endDate}</span>
              {y.isCurrent && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-saffron/10 text-saffron">current</span>}
            </div>
            {!y.isCurrent && (
              <form action={async () => { "use server"; await setCurrentAcademicYear(y.id); }}>
                <Button type="submit" variant="ghost" size="sm">Set current</Button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <div>
        <h2 className="font-display font-semibold mt-8 mb-2">Add a new academic year</h2>
        <AcademicYearForm />
      </div>
    </div>
  );
}
