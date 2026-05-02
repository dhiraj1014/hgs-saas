"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { FieldCombobox } from "@/components/ui/field";

const AUDIENCE_OPTIONS = [
  { value: "school", label: "School-wide" },
  { value: "class", label: "Class" },
  { value: "section", label: "Section" },
  { value: "students", label: "Students" },
];

export function AnnouncementsToolbar({
  initialQ,
  initialAudience,
}: {
  initialQ: string;
  initialAudience: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = q.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clearAll() {
    setQ("");
    router.replace(pathname, { scroll: false });
  }

  const hasFilter = !!(q || initialAudience);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-1 min-w-[220px] flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Search</span>
        <span className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Body text…"
            className="h-10 w-full rounded-lg border border-rule bg-white pl-9 pr-3 text-sm text-ink placeholder:text-mute/60 focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20"
          />
        </span>
      </label>

      <label className="flex w-44 flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Audience</span>
        <FieldCombobox
          value={initialAudience}
          onChange={(v) => setParam("audience", v)}
          options={AUDIENCE_OPTIONS}
          placeholder="All audiences"
          className="border border-rule bg-white px-3 py-2 rounded-lg border-b-[1.5px]"
        />
      </label>

      {hasFilter && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 self-end rounded-lg border border-transparent px-2 text-xs font-medium text-mute transition-colors hover:bg-cream hover:text-ink"
        >
          <X className="size-3.5" /> Clear
        </button>
      )}
    </div>
  );
}
