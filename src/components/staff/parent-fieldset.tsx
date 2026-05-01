"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export type ParentInput = { fullName: string; phone: string; email?: string; relationToStudent?: string; isPrimaryContact?: boolean };

export function ParentFieldset({ value, onChange }: { value: ParentInput[]; onChange: (next: ParentInput[]) => void }) {
  const [draft, setDraft] = useState<ParentInput>({ fullName: "", phone: "", email: "", relationToStudent: "Father", isPrimaryContact: true });
  return (
    <div className="space-y-3 border border-rule p-3 rounded">
      <h3 className="font-medium text-sm">Parents / Guardians</h3>
      <ul className="space-y-1 text-sm">
        {value.map((p, i) => (
          <li key={i} className="flex justify-between"><span>{p.fullName} · {p.phone} ({p.relationToStudent})</span>
            <button type="button" className="text-mute hover:text-red-600" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>×</button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Name</Label><Input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+91…" /></div>
        <div><Label>Email</Label><Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
        <div><Label>Relation</Label><Input value={draft.relationToStudent} onChange={(e) => setDraft({ ...draft, relationToStudent: e.target.value })} /></div>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          if (!draft.fullName || !draft.phone) return;
          onChange([...value, draft]);
          setDraft({ fullName: "", phone: "", email: "", relationToStudent: "Father", isPrimaryContact: false });
        }}
      >
        Add parent
      </Button>
    </div>
  );
}
