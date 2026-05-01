import { listSectionsForFilter } from "@/server/students";
import { StudentForm } from "@/components/staff/student-form";

export default async function NewStudentPage() {
  const sections = await listSectionsForFilter();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-semibold text-ink">New student</h1>
      <StudentForm sections={sections} />
    </div>
  );
}
