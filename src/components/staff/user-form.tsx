"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStaffUser } from "@/server/users";

const ROLES = ["super_admin", "principal", "office_staff", "accountant", "class_teacher", "subject_teacher"] as const;

export function UserForm() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      action={(fd) => {
        setErr(null);
        start(async () => {
          try {
            await createStaffUser({
              email: fd.get("email"), password: fd.get("password"),
              name: fd.get("name"), role: fd.get("role"), phone: fd.get("phone") || undefined,
            });
          } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
        });
      }}
      className="space-y-3 max-w-md"
    >
      <div><Label>Name</Label><Input name="name" required /></div>
      <div><Label>Email</Label><Input name="email" type="email" required /></div>
      <div><Label>Phone</Label><Input name="phone" /></div>
      <div><Label>Role</Label>
        <select name="role" className="border border-rule rounded px-3 py-2 w-full">
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div><Label>Initial password</Label><Input name="password" type="password" required /></div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button type="submit" disabled={pending}>Add staff user</Button>
    </form>
  );
}
