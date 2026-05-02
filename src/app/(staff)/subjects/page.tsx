import { listSubjects, createSubject } from "@/server/subjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGrid,
  FieldInput,
  FieldLabel,
  FormActions,
  FormCard,
} from "@/components/ui/field";
import { PageHeader } from "@/components/shared/page-header";

export default async function SubjectsPage() {
  const subjects = await listSubjects();

  async function add(formData: FormData) {
    "use server";
    await createSubject({
      name: formData.get("name"),
      code: formData.get("code"),
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Curriculum"
        title="Subjects"
        description="Master list of subjects taught at the school."
      />

      <Card className="bg-white p-0">
        {subjects.length === 0 ? (
          <CardContent className="py-10 text-center text-sm text-mute">
            No subjects yet — add the first one below.
          </CardContent>
        ) : (
          <ul className="divide-y divide-rule">
            {subjects.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium text-ink">{s.name}</span>
                <span className="rounded-full bg-cream px-2.5 py-0.5 font-mono text-[11px] text-mute">
                  {s.code}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">
          Add subject
        </h2>
        <FormCard>
          <form action={add}>
            <FieldGrid>
              <Field>
                <FieldLabel htmlFor="name" required>Name</FieldLabel>
                <FieldInput id="name" name="name" placeholder="Mathematics" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="code" required>Code</FieldLabel>
                <FieldInput id="code" name="code" placeholder="MATH" required />
              </Field>
            </FieldGrid>
            <FormActions>
              <Button type="submit" variant="saffron" className="h-9 px-4 text-sm">
                Add subject
              </Button>
            </FormActions>
          </form>
        </FormCard>
      </div>
    </div>
  );
}
