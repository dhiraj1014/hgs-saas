"use client";

import { useState, useTransition } from "react";
import { Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldHint,
  FieldLabel,
  FormCard,
} from "@/components/ui/field";
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
    <FormCard>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-mute">
            Required columns:{" "}
            <code className="rounded bg-cream px-1.5 py-0.5 font-mono text-xs text-ink">
              admission_no, first_name, last_name
            </code>
            . Optional:{" "}
            <code className="rounded bg-cream px-1.5 py-0.5 font-mono text-xs text-ink">
              dob, gender, section, blood_group, address, parent_name, parent_phone, parent_email, parent_relation
            </code>
            . The <code className="font-mono text-xs">section</code> column must match an existing section in the form{" "}
            <code className="font-mono text-xs">Class · Section</code> (e.g.,{" "}
            <code className="font-mono text-xs">Grade 5 · A</code>).
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="file">Spreadsheet</FieldLabel>
          <label
            htmlFor="file"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-rule bg-cream/40 px-5 py-6 transition-colors hover:border-saffron hover:bg-saffron/5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-[#B26116]">
              <Upload className="size-4" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block text-sm font-medium text-ink">
                {file ? file.name : "Choose .xlsx, .xls, or .csv file"}
              </span>
              <span className="block text-[11px] text-mute">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Click to browse"}
              </span>
            </div>
            <input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setCommitted(null);
              }}
              className="sr-only"
            />
          </label>
          <FieldHint>Generated with the official template? Just drop it in.</FieldHint>
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onPreview} variant="ghost" disabled={!file || pending}>
            {pending && !preview ? "Reading…" : "Preview"}
          </Button>
          <Button
            onClick={onCommit}
            variant="saffron"
            disabled={!preview || preview.errors.length > 0 || pending}
            className="h-9 px-4 text-sm"
          >
            Commit{preview ? ` (${preview.valid.length} students)` : ""}
          </Button>
        </div>

        {preview && (
          <div className="space-y-3 rounded-xl border border-rule bg-cream/40 p-4">
            <p className="text-sm text-ink">
              <span className="font-medium">{preview.rows}</span> rows scanned ·{" "}
              <span className="text-emerald-700">{preview.valid.length} valid</span> ·{" "}
              <span className="text-rose-700">{preview.errors.length} errors</span>
            </p>
            {preview.errors.length > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-700">
                  <AlertTriangle className="size-3.5" /> Validation errors
                </div>
                <ul className="space-y-1 text-sm text-rose-800">
                  {preview.errors.map((e, i) => (
                    <li key={i} className="font-mono text-xs">
                      Row {e.rowIndex} · <span className="font-semibold">{e.field}</span> · {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {committed && (
          <div
            className={
              committed.ok
                ? "flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                : "flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            }
          >
            {committed.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            )}
            <span>
              {committed.ok
                ? `Imported ${committed.inserted} students.`
                : `Aborted: ${committed.errors.length} errors.`}
            </span>
          </div>
        )}
      </div>
    </FormCard>
  );
}
