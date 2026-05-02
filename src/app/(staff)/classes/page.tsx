import { listClassesWithSections } from "@/server/classes";
import { Layers } from "lucide-react";
import { ClassCreator, SectionCreator } from "@/components/staff/class-section-editor";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export default async function ClassesPage() {
  const { currentYear, classes } = await listClassesWithSections();

  if (!currentYear) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Configuration" title="Classes & sections" />
        <Card className="bg-white">
          <CardContent className="py-10 text-center">
            <Layers className="mx-auto mb-3 size-7 text-mute" />
            <p className="text-sm font-medium text-ink">No active academic year</p>
            <p className="mt-1 text-sm text-mute">Create an academic year and mark it as current first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={currentYear.name}
        title="Classes & sections"
        description="The grades and the sections under each, scoped to the current year."
      />

      <div>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">
          Add class
        </h2>
        <ClassCreator />
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">
          Existing classes
        </h2>
        {classes.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="py-8 text-center text-sm text-mute">
              No classes yet — add one above.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {classes.map((c) => (
              <li key={c.id} className="rounded-2xl border border-rule bg-white p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-base font-semibold text-ink">{c.name}</p>
                  <span className="text-xs text-mute">
                    {c.sections.length} section{c.sections.length === 1 ? "" : "s"}
                  </span>
                </div>
                {c.sections.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {c.sections.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-full bg-cream px-3 py-1 text-xs font-medium text-ink"
                      >
                        Section {s.name}
                        {s.capacity ? <span className="ml-1 text-mute">· cap {s.capacity}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
                <SectionCreator classId={c.id} yearId={currentYear.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
