"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudent } from "@/server/students";
import { ParentFieldset, type ParentInput } from "./parent-fieldset";

type Section = { id: string; name: string; className: string | null };

export function StudentForm({ sections }: { sections: Section[] }) {
  const [pending, start] = useTransition();
  const [parents, setParents] = useState<ParentInput[]>([]);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      action={(fd) => {
        setErr(null);
        start(async () => {
          try {
            await createStudent({
              admissionNo: fd.get("admissionNo"),
              firstName: fd.get("firstName"),
              lastName: fd.get("lastName"),
              dob: fd.get("dob") || undefined,
              gender: fd.get("gender") || undefined,
              bloodGroup: fd.get("bloodGroup") || undefined,
              address: fd.get("address") || undefined,
              currentSectionId: fd.get("currentSectionId") || undefined,
              dateOfAdmission: fd.get("dateOfAdmission") || undefined,
            }, parents);
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
      className="space-y-4 max-w-2xl"
    >
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Admission no</Label><Input name="admissionNo" required /></div>
        <div><Label>Section</Label>
          <select name="currentSectionId" className="border border-rule rounded px-3 py-2 w-full">
            <option value="">— Unassigned —</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.className} · {s.name}</option>)}
          </select>
        </div>
        <div><Label>First name</Label><Input name="firstName" required /></div>
        <div><Label>Last name</Label><Input name="lastName" required /></div>
        <div><Label>Date of birth</Label><Input name="dob" type="date" /></div>
        <div><Label>Gender</Label><Input name="gender" /></div>
        <div><Label>Blood group</Label><Input name="bloodGroup" /></div>
        <div><Label>Date of admission</Label><Input name="dateOfAdmission" type="date" /></div>
      </div>
      <div><Label>Address</Label><Input name="address" /></div>

      <ParentFieldset value={parents} onChange={setParents} />

      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Create student"}</Button>
    </form>
  );
}
