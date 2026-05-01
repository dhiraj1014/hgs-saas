"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { previewImport, commitImport } from "@/server/students";

type Preview = Awaited<ReturnType<typeof previewImport>>;
type CommitResult = Awaited<ReturnType<typeof commitImport>>;

export function ImportWizard() {
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [committed, setCommitted] = useState<CommitResult | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function onPreview() {
    if (!file) return;
    const buf = await file.arrayBuffer();
    start(async () => setPreview(await previewImport(buf)));
  }

  async function onCommit() {
    if (!file) return;
    const buf = await file.arrayBuffer();
    start(async () => setCommitted(await commitImport(buf)));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-mute mb-2">
          Required columns: <code>admission_no, first_name, last_name</code>. Optional:
          <code> dob, gender, section, blood_group, address, parent_name, parent_phone, parent_email, parent_relation</code>.
          The <code>section</code> column must match an existing section in the form <code>Class · Section</code> (e.g., <code>Grade 5 · A</code>).
        </p>
        <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setCommitted(null); }} />
      </div>
      <div className="flex gap-2">
        <Button onClick={onPreview} disabled={!file || pending}>Preview</Button>
        <Button onClick={onCommit} disabled={!preview || preview.errors.length > 0 || pending} variant="default">
          Commit {preview ? `(${preview.valid.length} students)` : ""}
        </Button>
      </div>
      {preview && (
        <div className="space-y-2">
          <p className="text-sm">{preview.rows} rows scanned · {preview.valid.length} valid · {preview.errors.length} errors</p>
          {preview.errors.length > 0 && (
            <ul className="bg-red-50 border border-red-200 rounded p-3 text-sm space-y-1">
              {preview.errors.map((e, i) => (
                <li key={i}>Row {e.rowIndex} · <code>{e.field}</code> · {e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {committed && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
          {committed.ok ? `✓ Imported ${committed.inserted} students.` : `✗ Aborted: ${committed.errors.length} errors.`}
        </div>
      )}
    </div>
  );
}
