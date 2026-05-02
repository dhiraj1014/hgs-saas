import Link from "next/link";
import { Plus } from "lucide-react";
import { listAnnouncements } from "@/server/announcements";
import { requireSession } from "@/server/session";
import { can, type Role } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default async function AnnouncementsPage() {
  const session = await requireSession();
  const role = session.user.role as Role;
  const canSend = can(role, "announcements.send");
  const items = await listAnnouncements();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communications"
        title="Announcements"
        description={canSend ? "All announcements sent from the school." : "All announcements posted by the school."}
        action={canSend ? (
          <Link
            href="/announcements/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-saffron px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-[#B26116] hover:text-white"
          >
            <Plus className="size-3.5" /> New announcement
          </Link>
        ) : undefined}
      />
      {items.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-10 text-center text-sm text-mute">No announcements yet.</CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-rule bg-white">
          <div className="rounded-2xl">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-cream/95 shadow-[0_1px_0_var(--color-rule)] backdrop-blur supports-[backdrop-filter]:bg-cream/80">
                <tr className="text-left text-[11px] uppercase tracking-wider text-mute">
                  <th className="px-4 py-3 font-semibold first:rounded-tl-2xl">Sent at</th>
                  <th className="px-4 py-3 font-semibold">Audience</th>
                  <th className="px-4 py-3 font-semibold">Recipients</th>
                  <th className="px-4 py-3 font-semibold last:rounded-tr-2xl">Body</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {items.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-cream/40">
                    <td className="px-4 py-3 text-mute">{new Date(a.sentAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
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
    </div>
  );
}
