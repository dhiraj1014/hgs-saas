import { ImportWizard } from "@/components/staff/import-wizard";
import { PageHeader } from "@/components/shared/page-header";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bulk admissions"
        title="Import students"
        description="Upload a spreadsheet to create many students at once."
      />
      <ImportWizard />
    </div>
  );
}
