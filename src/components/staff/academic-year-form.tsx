"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <form action={onSubmit} className="space-y-3 max-w-md">
      <div><Label htmlFor="name">Name</Label><Input id="name" name="name" placeholder="2026-27" required /></div>
      <div><Label htmlFor="startDate">Start date</Label><Input id="startDate" name="startDate" type="date" required /></div>
      <div><Label htmlFor="endDate">End date</Label><Input id="endDate" name="endDate" type="date" required /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isCurrent" /> Set as current</label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Add academic year"}</Button>
    </form>
  );
}
