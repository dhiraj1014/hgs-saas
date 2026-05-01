"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Child = { studentId: string; firstName: string; lastName: string; admissionNo: string };

export function ChildSwitcher({ children, current }: { children: Child[]; current: string | null }) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newParams = new URLSearchParams(params.toString());
    newParams.set("child", e.target.value);
    router.push(`?${newParams.toString()}`);
  }

  if (children.length === 0) return null;
  if (children.length === 1) {
    const c = children[0]!;
    return <span className="text-sm text-mute">{c.firstName} {c.lastName} · {c.admissionNo}</span>;
  }
  return (
    <select onChange={onChange} value={current ?? children[0]!.studentId} className="border border-rule rounded px-2 py-1 text-sm">
      {children.map((c) => (
        <option key={c.studentId} value={c.studentId}>{c.firstName} {c.lastName} · {c.admissionNo}</option>
      ))}
    </select>
  );
}
