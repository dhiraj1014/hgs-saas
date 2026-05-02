import { BellRing } from "lucide-react";
import {
  listAllNotifications,
  type NotificationSortKey,
  type NotificationRange,
} from "@/server/notifications";
import { NOTIFICATIONS_DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SortableTh, type SortDir } from "@/components/ui/sortable-th";
import { TablePagination } from "@/components/ui/table-pagination";
import { NotificationsToolbar } from "@/components/staff/notifications-toolbar";
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

const VALID_SORT: Record<string, NotificationSortKey> = {
  createdAt: "createdAt",
  status: "status",
  templateKey: "templateKey",
};

function formatDate(d: Date) {
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "";
  const template = params.template ?? "";
  const sort = (params.sort && VALID_SORT[params.sort]) ?? undefined;
  const dir: SortDir | undefined = params.dir === "desc" ? "desc" : params.dir === "asc" ? "asc" : undefined;
  const range: NotificationRange =
    params.range === "30d" ? "30d" : params.range === "all" ? "all" : "7d";
  const page = Math.max(1, Number(params.page) || 1);

  const { rows, total } = await listAllNotifications({
    q: q || undefined,
    status: status || undefined,
    template: template || undefined,
    sort,
    dir,
    range,
    page,
    size: NOTIFICATIONS_DEFAULT_PAGE_SIZE,
  });

  const hasActiveFilter = !!(q || status || template);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communications"
        title="Notifications log"
        description={`${total} message${total === 1 ? "" : "s"}${hasActiveFilter ? " matching" : ""}.`}
      />

      <NotificationsToolbar
        initialQ={q}
        initialStatus={status}
        initialTemplate={template}
        initialRange={range}
      />

      {rows.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-10 text-center">
            <BellRing className="mx-auto mb-3 size-7 text-mute" />
            <p className="text-sm font-medium text-ink">
              {hasActiveFilter ? "No matching notifications" : "No notifications yet"}
            </p>
            <p className="mt-1 text-sm text-mute">
              {hasActiveFilter
                ? "Try a different search or clear the filters."
                : "Notifications will appear here once attendance is marked or announcements are sent."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-rule bg-white">
          <div className="rounded-2xl">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-cream/95 shadow-[0_1px_0_var(--color-rule)] backdrop-blur supports-[backdrop-filter]:bg-cream/80">
                <tr className="text-left text-[11px] uppercase tracking-wider text-mute">
                  <SortableTh
                    label="Time"
                    sortKey="createdAt"
                    currentKey={sort}
                    currentDir={dir}
                    basePath="/notifications"
                    searchParams={params}
                    className="first:rounded-tl-2xl"
                  />
                  <SortableTh
                    label="Template"
                    sortKey="templateKey"
                    currentKey={sort}
                    currentDir={dir}
                    basePath="/notifications"
                    searchParams={params}
                  />
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <SortableTh
                    label="Status"
                    sortKey="status"
                    currentKey={sort}
                    currentDir={dir}
                    basePath="/notifications"
                    searchParams={params}
                  />
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold last:rounded-tr-2xl">Notes</th>
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
        </div>
      )}

      {rows.length > 0 && (
        <TablePagination
          total={total}
          page={page}
          size={NOTIFICATIONS_DEFAULT_PAGE_SIZE}
          basePath="/notifications"
          searchParams={params}
        />
      )}
    </div>
  );
}
