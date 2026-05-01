import { ImportWizard } from "@/components/staff/import-wizard";

export default function ImportPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-display font-semibold text-ink">Import students</h1>
      <ImportWizard />
    </div>
  );
}
