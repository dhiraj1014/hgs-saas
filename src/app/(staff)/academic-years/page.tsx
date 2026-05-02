import { listAcademicYears, setCurrentAcademicYear } from "@/server/academic-years";
import { AcademicYearForm } from "@/components/staff/academic-year-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export default async function AcademicYearsPage() {
  const years = await listAcademicYears();
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuration"
        title="Academic years"
        description="Set the active session and manage past years."
      />

      <Card className="bg-white p-0">
        {years.length === 0 ? (
          <CardContent className="py-10 text-center text-sm text-mute">
            No academic years yet — add one below.
          </CardContent>
        ) : (
          <ul className="divide-y divide-rule">
            {years.map((y) => (
              <li key={y.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-medium text-ink">
                    {y.name}
                    {y.isCurrent && (
                      <span className="ml-2 rounded-full bg-saffron/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#B26116]">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-mute">
                    {y.startDate} → {y.endDate}
                  </p>
                </div>
                {!y.isCurrent && (
                  <form action={async () => { "use server"; await setCurrentAcademicYear(y.id); }}>
                    <Button type="submit" variant="ghost" size="sm">
                      Set current
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">
          Add a new academic year
        </h2>
        <AcademicYearForm />
      </div>
    </div>
  );
}
