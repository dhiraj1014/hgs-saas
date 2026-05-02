import { MessageSquare, Megaphone, AlertCircle, Clock, ShieldCheck } from "lucide-react";
import { listNotificationsForParent } from "@/server/notifications";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TEMPLATE_LABEL: Record<string, { label: string; Icon: typeof MessageSquare }> = {
  parent_otp: { label: "Login code", Icon: ShieldCheck },
  attendance_absent: { label: "Absence alert", Icon: AlertCircle },
  attendance_late: { label: "Late arrival", Icon: Clock },
  announcement: { label: "Announcement", Icon: Megaphone },
};

const STATUS_TONE: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  stub_sent: "bg-sky-50 text-sky-700 ring-sky-200",
  failed: "bg-rose-50 text-rose-700 ring-rose-200",
  rate_limited: "bg-amber-50 text-amber-700 ring-amber-200",
};

function formatDate(d: Date) {
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default async function ParentNotificationsPage() {
  const rows = await listNotificationsForParent();

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-saffron">SMS history</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Messages we&apos;ve sent you</h1>
      </header>

      {rows.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-10 text-center">
            <MessageSquare className="mx-auto mb-3 size-8 text-mute" />
            <p className="text-sm font-medium text-ink">No messages yet</p>
            <p className="mt-1 text-sm text-mute">Login codes, attendance alerts, and announcements will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const meta = TEMPLATE_LABEL[r.templateKey] ?? { label: r.templateKey, Icon: MessageSquare };
            const Icon = meta.Icon;
            const tone = STATUS_TONE[r.status] ?? "bg-ink/5 text-mute ring-ink/10";
            return (
              <li key={r.id}>
                <Card size="sm" className="bg-white">
                  <CardContent className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-saffron/15 text-saffron">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{meta.label}</p>
                      <p className="text-[11px] text-mute">{formatDate(new Date(r.createdAt))}</p>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset", tone)}>
                      {r.status.replace("_", " ")}
                    </span>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
