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
import { createStaffUser } from "@/server/users";

const ROLES = [
  { value: "super_admin", label: "Super admin" },
  { value: "principal", label: "Principal" },
  { value: "office_staff", label: "Office staff" },
  { value: "accountant", label: "Accountant" },
  { value: "class_teacher", label: "Class teacher" },
  { value: "subject_teacher", label: "Subject teacher" },
] as const;

export function UserForm() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <FormCard>
      <form
        action={(fd) => {
          setErr(null);
          start(async () => {
            try {
              await createStaffUser({
                email: fd.get("email"),
                password: fd.get("password"),
                name: fd.get("name"),
                role: fd.get("role"),
                phoneNumber: fd.get("phoneNumber") || undefined,
              });
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Failed");
            }
          });
        }}
      >
        <FieldGrid>
          <Field full>
            <FieldLabel htmlFor="name" required>Name</FieldLabel>
            <FieldInput id="name" name="name" required autoComplete="name" />
          </Field>

          <Field>
            <FieldLabel htmlFor="email" required>Email</FieldLabel>
            <FieldInput id="email" name="email" type="email" required autoComplete="email" />
          </Field>

          <Field>
            <FieldLabel htmlFor="phoneNumber">Phone</FieldLabel>
            <FieldInput id="phoneNumber" name="phoneNumber" placeholder="+91…" autoComplete="tel" />
          </Field>

          <Field>
            <FieldLabel htmlFor="role" required>Role</FieldLabel>
            <FieldCombobox
              id="role"
              name="role"
              required
              placeholder="Select a role…"
              options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="password" required>Initial password</FieldLabel>
            <FieldInput id="password" name="password" type="password" required autoComplete="new-password" />
          </Field>
        </FieldGrid>

        <FormActions>
          {err && <FormStatus tone="error">{err}</FormStatus>}
          <Button type="submit" variant="saffron" disabled={pending} className="h-10 px-5 text-sm">
            {pending ? "Saving…" : "Add staff user"}
          </Button>
        </FormActions>
      </form>
    </FormCard>
  );
}
