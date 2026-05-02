import { Megaphone, GraduationCap, Users, User } from "lucide-react";
import { listAnnouncementsForParent } from "@/server/announcements";
import { Card, CardContent } from "@/components/ui/card";

function audienceLabel(t: string) {
  if (t === "school") return { label: "School-wide", Icon: Megaphone };
  if (t === "class") return { label: "Class", Icon: GraduationCap };
  if (t === "section") return { label: "Section", Icon: Users };
  return { label: "Personal", Icon: User };
}

function formatDate(d: Date) {
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default async function ParentAnnouncementsPage() {
  const items = await listAnnouncementsForParent();
  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-saffron">From the school</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Announcements</h1>
      </header>

      {items.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-10 text-center">
            <Megaphone className="mx-auto mb-3 size-8 text-mute" />
            <p className="text-sm font-medium text-ink">No announcements yet</p>
            <p className="mt-1 text-sm text-mute">When the school posts updates, they&apos;ll appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const { label, Icon } = audienceLabel(a.audienceType);
            return (
              <li key={a.id}>
                <Card className="bg-white">
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron/10 px-2.5 py-1 text-[11px] font-medium text-saffron">
                        <Icon className="size-3" /> {label}
                      </span>
                      <time className="text-[11px] uppercase tracking-wider text-mute">{formatDate(new Date(a.sentAt))}</time>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{a.body}</p>
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
