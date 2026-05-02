import { BellRing } from "lucide-react";
import { listAllNotifications } from "@/server/notifications";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TEMPLATE_LABEL: Record<string, string> = {
  parent_otp: "Login code",
  attendance_absent: "Absence alert",
  attendance_late: "Late arrival",
  announcement: "Announcement",
};

const STATUS_TONE: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  stub_sent: "bg-sky-50 text-sky-700 ring-sky-200",
  failed: "bg-rose-50 text-rose-700 ring-rose-200",
  rate_limited: "bg-amber-50 text-amber-700 ring-amber-200",
};

function formatDate(d: Date) {
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function NotificationsPage() {
  const rows = await listAllNotifications();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communications"
        title="Notifications log"
        description="Every SMS the system has tried to send — login codes, attendance alerts, announcements."
      />

      {rows.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-10 text-center">
            <BellRing className="mx-auto mb-3 size-7 text-mute" />
            <p className="text-sm font-medium text-ink">No notifications yet</p>
            <p className="mt-1 text-sm text-mute">
              Notifications will appear here once attendance is marked or announcements are sent.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white p-0">
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-cream">
                <tr className="text-left text-[11px] uppercase tracking-wider text-mute">
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Template</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-cream/40">
                    <td className="whitespace-nowrap px-4 py-3 text-mute">
                      {formatDate(new Date(r.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink">
                        {TEMPLATE_LABEL[r.templateKey] ?? r.templateKey}
                      </span>
                      <span className="ml-1.5 text-[11px] uppercase tracking-wider text-mute">
                        · {r.channel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-mute">
                      {r.recipientPhone}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                          STATUS_TONE[r.status] ?? "bg-ink/5 text-mute ring-rule",
                        )}
                      >
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-mute">
                      {r.provider ?? "—"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-rose-700">
                      {r.errorMessage ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
