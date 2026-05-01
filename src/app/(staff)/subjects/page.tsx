import { listSubjects, createSubject } from "@/server/subjects";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function SubjectsPage() {
  const subjects = await listSubjects();

  async function add(formData: FormData) {
    "use server";
    await createSubject({ name: formData.get("name"), code: formData.get("code") });
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-display font-semibold text-ink">Subjects</h1>
      <ul className="divide-y divide-rule rounded border border-rule bg-white">
        {subjects.map((s) => (
          <li key={s.id} className="px-4 py-2 flex justify-between text-sm">
            <span>{s.name}</span><span className="text-mute">{s.code}</span>
          </li>
        ))}
      </ul>
      <form action={add} className="space-y-3 max-w-md">
        <h2 className="font-display font-semibold">Add subject</h2>
        <div><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
        <div><Label htmlFor="code">Code</Label><Input id="code" name="code" required placeholder="MATH" /></div>
        <Button type="submit">Add</Button>
      </form>
    </div>
  );
}
