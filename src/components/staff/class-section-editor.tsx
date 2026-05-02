"use client";

import { useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGrid,
  FieldInput,
  FieldLabel,
  FormCard,
} from "@/components/ui/field";
import { createClass, createSection } from "@/server/classes";

export function ClassCreator() {
  const [pending, start] = useTransition();
  return (
    <FormCard>
      <form
        action={(fd) =>
          start(async () => {
            await createClass({ name: fd.get("name"), order: fd.get("order") });
          })
        }
      >
        <FieldGrid>
          <Field>
            <FieldLabel htmlFor="class-name" required>Class name</FieldLabel>
            <FieldInput id="class-name" name="name" required placeholder="Grade 5" />
          </Field>
          <Field>
            <FieldLabel htmlFor="class-order" required>Order</FieldLabel>
            <FieldInput id="class-order" name="order" type="number" required placeholder="5" />
          </Field>
        </FieldGrid>
        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="saffron" disabled={pending} className="h-9 px-4 text-sm">
            <Plus className="size-3.5" /> {pending ? "Saving…" : "Add class"}
          </Button>
        </div>
      </form>
    </FormCard>
  );
}

export function SectionCreator({ classId, yearId }: { classId: string; yearId: string }) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) =>
        start(async () => {
          await createSection({
            classId,
            academicYearId: yearId,
            name: fd.get("name"),
            capacity: fd.get("capacity") || undefined,
          });
        })
      }
      className="mt-3 flex flex-wrap items-end gap-4"
    >
      <Field className="w-32">
        <FieldLabel>Section</FieldLabel>
        <FieldInput name="name" placeholder="A / B / C" required />
      </Field>
      <Field className="w-32">
        <FieldLabel>Capacity</FieldLabel>
        <FieldInput name="capacity" type="number" placeholder="40" />
      </Field>
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        <Plus className="size-3.5" /> Add
      </Button>
    </form>
  );
}
