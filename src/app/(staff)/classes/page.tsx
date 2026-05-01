import { listClassesWithSections } from "@/server/classes";
import { ClassCreator, SectionCreator } from "@/components/staff/class-section-editor";

export default async function ClassesPage() {
  const { currentYear, classes } = await listClassesWithSections();

  if (!currentYear) {
    return (
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink">Classes & sections</h1>
        <p className="mt-2 text-mute">Create an academic year and mark it as current first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink">Classes & sections</h1>
        <p className="text-mute text-sm mt-1">Current year: {currentYear.name}</p>
      </div>
      <ClassCreator />
      <ul className="space-y-4">
        {classes.map((c) => (
          <li key={c.id} className="rounded border border-rule bg-white p-4">
            <div className="font-medium">{c.name}</div>
            <ul className="mt-2 flex gap-2 flex-wrap">
              {c.sections.map((s) => (
                <li key={s.id} className="px-3 py-1 text-sm rounded bg-cream border border-rule">{s.name}{s.capacity ? ` (${s.capacity})` : ""}</li>
              ))}
            </ul>
            <SectionCreator classId={c.id} yearId={currentYear.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
