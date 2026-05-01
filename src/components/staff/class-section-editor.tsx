"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClass, createSection } from "@/server/classes";

export function ClassCreator() {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(async () => { await createClass({ name: fd.get("name"), order: fd.get("order") }); })}
      className="flex gap-2 items-end"
    >
      <div><Label htmlFor="name">Class name</Label><Input id="name" name="name" required placeholder="Grade 5" /></div>
      <div><Label htmlFor="order">Order</Label><Input id="order" name="order" type="number" required /></div>
      <Button type="submit" disabled={pending}>Add class</Button>
    </form>
  );
}

export function SectionCreator({ classId, yearId }: { classId: string; yearId: string }) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(async () => { await createSection({ classId, academicYearId: yearId, name: fd.get("name"), capacity: fd.get("capacity") || undefined }); })}
      className="flex gap-2 items-end mt-2"
    >
      <Input name="name" placeholder="Section (A/B/C)" required className="w-32" />
      <Input name="capacity" type="number" placeholder="Capacity" className="w-32" />
      <Button type="submit" size="sm" disabled={pending}>Add</Button>
    </form>
  );
}
