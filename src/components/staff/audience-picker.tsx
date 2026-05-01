"use client";

type Klass = { id: string; name: string };
type Section = { id: string; name: string; className: string | null };

export type AudienceState =
  | { type: "school" }
  | { type: "class"; classId: string }
  | { type: "section"; sectionId: string };

export function AudiencePicker({
  classes, sections, value, onChange, allowSchoolWide,
}: {
  classes: Klass[]; sections: Section[];
  value: AudienceState; onChange: (s: AudienceState) => void;
  allowSchoolWide: boolean;
}) {
  return (
    <div className="space-y-3">
      {allowSchoolWide && (
        <label className="block text-sm">
          <input type="radio" checked={value.type === "school"} onChange={() => onChange({ type: "school" })} className="mr-2" />
          Whole school
        </label>
      )}
      <label className="block text-sm">
        <input type="radio" checked={value.type === "class"} onChange={() => onChange({ type: "class", classId: classes[0]?.id ?? "" })} className="mr-2" />
        A class
        {value.type === "class" && (
          <select className="ml-2 border border-rule rounded px-2 py-1" value={value.classId}
            onChange={(e) => onChange({ type: "class", classId: e.target.value })}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </label>
      <label className="block text-sm">
        <input type="radio" checked={value.type === "section"} onChange={() => onChange({ type: "section", sectionId: sections[0]?.id ?? "" })} className="mr-2" />
        A section
        {value.type === "section" && (
          <select className="ml-2 border border-rule rounded px-2 py-1" value={value.sectionId}
            onChange={(e) => onChange({ type: "section", sectionId: e.target.value })}>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.className} · {s.name}</option>)}
          </select>
        )}
      </label>
    </div>
  );
}
