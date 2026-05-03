import Link from "next/link";
import { Plus } from "lucide-react";
import { listAnnouncements, type AnnouncementSortKey } from "@/server/announcements";
import { ANNOUNCEMENTS_DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { requireSession } from "@/server/session";
import { can, type Role } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SortableTh, type SortDir } from "@/components/ui/sortable-th";
import { TablePagination } from "@/components/ui/table-pagination";
import { AnnouncementsToolbar } from "@/components/staff/announcements-toolbar";
import { HEADER_ACTION_PRIMARY } from "@/components/shared/header-actions";

const VALID_SORT: Record<string, AnnouncementSortKey> = {
  sentAt: "sentAt",
  audienceType: "audienceType",
  recipientCount: "recipientCount",
};

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const session = await requireSession();
  const role = session.user.role as Role;
  const canSend = can(role, "announcements.send");

  const q = params.q ?? "";
  const audience = params.audience ?? "";
  const sort = params.sort ? VALID_SORT[params.sort] : undefined;
  const dir: SortDir | undefined = params.dir === "desc" ? "desc" : params.dir === "asc" ? "asc" : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const { rows: items, total } = await listAnnouncements({
    q: q || undefined,
    audience: audience || undefined,
    sort,
    dir,
    page,
    size: ANNOUNCEMENTS_DEFAULT_PAGE_SIZE,
  });

  const hasActiveFilter = !!(q || audience);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communications"
        title="Announcements"
        description={`${total} announcement${total === 1 ? "" : "s"}${hasActiveFilter ? " matching" : ""}.`}
        action={canSend ? (
          <Link href="/announcements/new" className={HEADER_ACTION_PRIMARY}>
            <Plus className="size-3.5" /> New announcement
          </Link>
        ) : undefined}
      />

      <AnnouncementsToolbar initialQ={q} initialAudience={audience} />

      {items.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-10 text-center text-sm text-mute">
            {hasActiveFilter ? "No matching announcements." : "No announcements yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-rule bg-white">
          <div className="rounded-2xl">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-cream/95 shadow-[0_1px_0_var(--color-rule)] backdrop-blur supports-[backdrop-filter]:bg-cream/80">
                <tr className="text-left text-[11px] uppercase tracking-wider text-mute">
                  <SortableTh
                    label="Sent at"
                    sortKey="sentAt"
                    currentKey={sort}
                    currentDir={dir}
                    basePath="/announcements"
                    searchParams={params}
                    className="first:rounded-tl-2xl"
                  />
                  <SortableTh
                    label="Audience"
                    sortKey="audienceType"
                    currentKey={sort}
                    currentDir={dir}
                    basePath="/announcements"
                    searchParams={params}
                  />
                  <SortableTh
                    label="Recipients"
                    sortKey="recipientCount"
                    currentKey={sort}
                    currentDir={dir}
                    basePath="/announcements"
                    searchParams={params}
                  />
                  <th className="px-4 py-3 font-semibold last:rounded-tr-2xl">Body</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {items.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-cream/40">
                    <td className="whitespace-nowrap px-4 py-3 text-mute">
                      {new Date(a.sentAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-saffron/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#B26116]">
                        {a.audienceType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-mute">{a.recipientCount}</td>
                    <td className="max-w-md truncate px-4 py-3 text-ink">{a.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <TablePagination
          total={total}
          page={page}
          size={ANNOUNCEMENTS_DEFAULT_PAGE_SIZE}
          basePath="/announcements"
          searchParams={params}
        />
      )}
    </div>
  );
}
