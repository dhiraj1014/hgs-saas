"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { FieldCombobox } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "sent", label: "Sent" },
  { value: "stub_sent", label: "Stub sent" },
  { value: "failed", label: "Failed" },
  { value: "rate_limited", label: "Rate limited" },
];

const TEMPLATE_OPTIONS = [
  { value: "parent_otp", label: "Login code" },
  { value: "attendance_absent", label: "Absence alert" },
  { value: "attendance_late", label: "Late arrival" },
  { value: "announcement", label: "Announcement" },
];

const RANGE_OPTIONS: { value: "7d" | "30d" | "all"; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export function NotificationsToolbar({
  initialQ,
  initialStatus,
  initialTemplate,
  initialRange,
}: {
  initialQ: string;
  initialStatus: string;
  initialTemplate: string;
  initialRange: "7d" | "30d" | "all";
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

  const hasFilter = !!(q || initialStatus || initialTemplate);

  return (
    <div className="space-y-3"><div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-1 min-w-[220px] flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Search</span>
        <span className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Recipient phone…"
            className="h-10 w-full rounded-lg border border-rule bg-white pl-9 pr-3 text-sm text-ink placeholder:text-mute/60 focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20"
          />
        </span>
      </label>

      <label className="flex w-44 flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Template</span>
        <FieldCombobox
          value={initialTemplate}
          onChange={(v) => setParam("template", v)}
          options={TEMPLATE_OPTIONS}
          placeholder="All templates"
          className="border border-rule bg-white px-3 py-2 rounded-lg border-b-[1.5px]"
        />
      </label>

      <label className="flex w-44 flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Status</span>
        <FieldCombobox
          value={initialStatus}
          onChange={(v) => setParam("status", v)}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
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

      <div className="flex items-center gap-1.5">
        {RANGE_OPTIONS.map((r) => {
          const active = initialRange === r.value;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => setParam("range", r.value === "7d" ? "" : r.value)}
              className={cn(
                "inline-flex h-7 cursor-pointer items-center rounded-full border px-3 text-[11px] font-medium uppercase tracking-wider transition-colors",
                active
                  ? "border-saffron bg-saffron/10 text-[#B26116]"
                  : "border-rule bg-white text-mute hover:bg-cream hover:text-ink",
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
