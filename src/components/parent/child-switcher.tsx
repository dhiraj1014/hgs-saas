"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Child = { studentId: string; firstName: string; lastName: string; admissionNo: string };

export function ChildSwitcher({ students, current }: { students: Child[]; current: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (students.length === 0) return null;
  if (students.length === 1) {
    const c = students[0]!;
    return (
      <div className="flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-xs">
        <span className="grid size-6 place-items-center rounded-full bg-saffron/15 font-semibold text-saffron">
          {c.firstName.charAt(0)}
        </span>
        <span className="hidden text-ink sm:inline">{c.firstName} {c.lastName}</span>
        <span className="text-mute">{c.admissionNo}</span>
      </div>
    );
  }
  const value = current ?? students[0]!.studentId;
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const newParams = new URLSearchParams(params.toString());
        newParams.set("child", next);
        router.push(`${pathname}?${newParams.toString()}`);
      }}
    >
      <SelectTrigger size="sm" className="rounded-full border-ink/10 bg-ink/5 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {students.map((c) => (
          <SelectItem key={c.studentId} value={c.studentId}>
            {c.firstName} {c.lastName} · {c.admissionNo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
