import { listSectionsForFilter } from "@/server/students";
import { StudentForm } from "@/components/staff/student-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function NewStudentPage() {
  const sections = await listSectionsForFilter();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admissions"
        title="New student"
        description="Create a student record and link primary parents."
      />
      <StudentForm sections={sections} />
    </div>
  );
}
