"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldCheckbox,
  FieldGrid,
  FieldInput,
  FieldLabel,
  FormActions,
  FormCard,
  FormStatus,
} from "@/components/ui/field";
import { createAcademicYear } from "@/server/academic-years";

export function AcademicYearForm() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setErr(null);
    start(async () => {
      try {
        await createAcademicYear({
          name: String(formData.get("name")),
          startDate: String(formData.get("startDate")),
          endDate: String(formData.get("endDate")),
          isCurrent: formData.get("isCurrent") === "on",
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <FormCard>
      <form action={onSubmit}>
        <FieldGrid>
          <Field full>
            <FieldLabel htmlFor="name" required>Name</FieldLabel>
            <FieldInput id="name" name="name" placeholder="2026-27" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="startDate" required>Start date</FieldLabel>
            <FieldInput id="startDate" name="startDate" type="date" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="endDate" required>End date</FieldLabel>
            <FieldInput id="endDate" name="endDate" type="date" required />
          </Field>
          <Field full>
            <FieldCheckbox name="isCurrent" label="Set as current academic year" />
          </Field>
        </FieldGrid>

        <FormActions>
          {err && <FormStatus tone="error">{err}</FormStatus>}
          <Button type="submit" variant="saffron" disabled={pending} className="h-10 px-5 text-sm">
            {pending ? "Saving…" : "Add academic year"}
          </Button>
        </FormActions>
      </form>
    </FormCard>
  );
}
