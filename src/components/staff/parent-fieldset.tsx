"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldCombobox,
  FieldGrid,
  FieldInput,
  FieldLabel,
} from "@/components/ui/field";

export type ParentInput = {
  fullName: string;
  phone: string;
  email?: string;
  relationToStudent?: string;
  isPrimaryContact?: boolean;
};

const RELATIONS = ["Father", "Mother", "Guardian"] as const;

export function ParentFieldset({
  value,
  onChange,
}: {
  value: ParentInput[];
  onChange: (next: ParentInput[]) => void;
}) {
  const [draft, setDraft] = useState<ParentInput>({
    fullName: "",
    phone: "",
    email: "",
    relationToStudent: "Father",
    isPrimaryContact: true,
  });

  function addParent() {
    if (!draft.fullName.trim() || !draft.phone.trim()) return;
    onChange([...value, draft]);
    setDraft({
      fullName: "",
      phone: "",
      email: "",
      relationToStudent: "Father",
      isPrimaryContact: false,
    });
  }

  return (
    <fieldset className="rounded-xl border border-rule bg-cream/40 p-5">
      <legend className="-ml-1 px-1 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-[#B26116]">
        Parents / Guardians
      </legend>

      {value.length > 0 && (
        <ul className="mb-5 divide-y divide-rule rounded-lg border border-rule bg-white">
          {value.map((p, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0 leading-tight">
                <p className="truncate font-medium text-ink">
                  {p.fullName}
                  {p.isPrimaryContact && (
                    <span className="ml-2 rounded-full bg-saffron/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#B26116]">
                      Primary
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-mute">
                  {p.phone}
                  {p.relationToStudent ? ` · ${p.relationToStudent}` : ""}
                  {p.email ? ` · ${p.email}` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="Remove parent"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-mute transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <FieldGrid className="gap-y-5">
        <Field>
          <FieldLabel>Name</FieldLabel>
          <FieldInput
            value={draft.fullName}
            onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel>Phone</FieldLabel>
          <FieldInput
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            placeholder="+91…"
          />
        </Field>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <FieldInput
            type="email"
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            placeholder="optional"
          />
        </Field>
        <Field>
          <FieldLabel>Relation</FieldLabel>
          <FieldCombobox
            value={draft.relationToStudent}
            onChange={(v) => setDraft({ ...draft, relationToStudent: v })}
            options={RELATIONS.map((r) => ({ value: r, label: r }))}
          />
        </Field>
      </FieldGrid>

      <div className="mt-5 flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-mute">
          <input
            type="checkbox"
            className="size-3.5 cursor-pointer accent-saffron"
            checked={!!draft.isPrimaryContact}
            onChange={(e) => setDraft({ ...draft, isPrimaryContact: e.target.checked })}
          />
          <span>Primary contact</span>
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addParent}
          disabled={!draft.fullName.trim() || !draft.phone.trim()}
        >
          <Plus className="size-3.5" /> Add parent
        </Button>
      </div>
    </fieldset>
  );
}
