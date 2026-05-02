"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldCombobox,
  FieldGrid,
  FieldInput,
  FieldLabel,
  FormActions,
  FormCard,
  FormStatus,
} from "@/components/ui/field";
import { createStudent } from "@/server/students";
import { ParentFieldset, type ParentInput } from "./parent-fieldset";

type Section = { id: string; name: string; className: string | null };

export function StudentForm({ sections }: { sections: Section[] }) {
  const [pending, start] = useTransition();
  const [parents, setParents] = useState<ParentInput[]>([]);
  const [err, setErr] = useState<string | null>(null);

  return (
    <FormCard>
      <form
        action={(fd) => {
          setErr(null);
          start(async () => {
            try {
              await createStudent(
                {
                  admissionNo: fd.get("admissionNo"),
                  firstName: fd.get("firstName"),
                  lastName: fd.get("lastName"),
                  dob: fd.get("dob") || undefined,
                  gender: fd.get("gender") || undefined,
                  bloodGroup: fd.get("bloodGroup") || undefined,
                  address: fd.get("address") || undefined,
                  currentSectionId: fd.get("currentSectionId") || undefined,
                  dateOfAdmission: fd.get("dateOfAdmission") || undefined,
                },
                parents,
              );
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Failed");
            }
          });
        }}
      >
        <FieldGrid>
          <Field>
            <FieldLabel htmlFor="admissionNo" required>Admission no</FieldLabel>
            <FieldInput id="admissionNo" name="admissionNo" required placeholder="HGS0001" />
          </Field>

          <Field>
            <FieldLabel htmlFor="currentSectionId">Section</FieldLabel>
            <FieldCombobox
              id="currentSectionId"
              name="currentSectionId"
              placeholder="— Unassigned —"
              options={sections.map((s) => ({ value: s.id, label: `${s.className} · ${s.name}` }))}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="firstName" required>First name</FieldLabel>
            <FieldInput id="firstName" name="firstName" required />
          </Field>

          <Field>
            <FieldLabel htmlFor="lastName" required>Last name</FieldLabel>
            <FieldInput id="lastName" name="lastName" required />
          </Field>

          <Field>
            <FieldLabel htmlFor="dob">Date of birth</FieldLabel>
            <FieldInput id="dob" name="dob" type="date" />
          </Field>

          <Field>
            <FieldLabel htmlFor="gender">Gender</FieldLabel>
            <FieldCombobox
              id="gender"
              name="gender"
              placeholder="—"
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="bloodGroup">Blood group</FieldLabel>
            <FieldInput id="bloodGroup" name="bloodGroup" placeholder="e.g. O+" />
          </Field>

          <Field>
            <FieldLabel htmlFor="dateOfAdmission">Date of admission</FieldLabel>
            <FieldInput id="dateOfAdmission" name="dateOfAdmission" type="date" />
          </Field>

          <Field full>
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <FieldInput id="address" name="address" placeholder="House no, street, locality" />
          </Field>
        </FieldGrid>

        <div className="mt-8">
          <ParentFieldset value={parents} onChange={setParents} />
        </div>

        <FormActions>
          {err && <FormStatus tone="error">{err}</FormStatus>}
          <Button type="submit" variant="saffron" disabled={pending} className="h-10 px-5 text-sm">
            {pending ? "Saving…" : "Create student"}
          </Button>
        </FormActions>
      </form>
    </FormCard>
  );
}
