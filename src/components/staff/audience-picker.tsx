"use client";

import { Globe, Layers, Users } from "lucide-react";
import { FieldCombobox } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Klass = { id: string; name: string };
type Section = { id: string; name: string; className: string | null };

export type AudienceState =
  | { type: "school" }
  | { type: "class"; classId: string }
  | { type: "section"; sectionId: string };

export function AudiencePicker({
  classes,
  sections,
  value,
  onChange,
  allowSchoolWide,
}: {
  classes: Klass[];
  sections: Section[];
  value: AudienceState;
  onChange: (s: AudienceState) => void;
  allowSchoolWide: boolean;
}) {
  const options: { type: AudienceState["type"]; Icon: typeof Globe; label: string; hint: string }[] = [
    ...(allowSchoolWide
      ? [{ type: "school" as const, Icon: Globe, label: "Whole school", hint: "Every parent on record" }]
      : []),
    { type: "class", Icon: Layers, label: "A class", hint: "All sections of one grade" },
    { type: "section", Icon: Users, label: "A section", hint: "Single classroom" },
  ];

  return (
    <div className="space-y-3">
      {options.map(({ type, Icon, label, hint }) => {
        const active = value.type === type;
        return (
          <div
            key={type}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
              active ? "border-saffron bg-saffron/5" : "border-rule bg-white hover:border-ink/20",
            )}
          >
            <label className="flex min-w-0 flex-1 items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="audience"
                className="size-4 shrink-0 cursor-pointer accent-saffron"
                checked={active}
                onChange={() => {
                  if (type === "school") onChange({ type: "school" });
                  else if (type === "class") onChange({ type: "class", classId: classes[0]?.id ?? "" });
                  else onChange({ type: "section", sectionId: sections[0]?.id ?? "" });
                }}
              />
              <Icon className={cn("size-4 shrink-0", active ? "text-[#B26116]" : "text-mute")} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-sm font-medium text-ink">{label}</span>
                <span className="block text-[11px] text-mute">{hint}</span>
              </span>
            </label>
            {active && type === "class" && (
              <FieldCombobox
                value={value.type === "class" ? value.classId : ""}
                onChange={(v) => onChange({ type: "class", classId: v })}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Pick a class…"
                className="w-44 shrink-0"
              />
            )}
            {active && type === "section" && (
              <FieldCombobox
                value={value.type === "section" ? value.sectionId : ""}
                onChange={(v) => onChange({ type: "section", sectionId: v })}
                options={sections.map((s) => ({ value: s.id, label: `${s.className} · ${s.name}` }))}
                placeholder="Pick a section…"
                className="w-52 shrink-0"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
