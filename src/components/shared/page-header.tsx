import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B26116]">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="max-w-prose text-sm text-mute">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </header>
  );
}
