import Link from "next/link";
import { ChevronRight, Calendar, Megaphone, GraduationCap } from "lucide-react";
import { getLinkedStudents, getChildAttendance } from "@/server/parent-queries";
import { listAnnouncementsForParent } from "@/server/announcements";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function monthRange(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
  return { start: `${yyyy}-${mm}-01`, end: `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`, label: now.toLocaleString("en-IN", { month: "long", year: "numeric" }) };
}

function timeAgo(d: Date) {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function ParentDashboard() {
  const children = await getLinkedStudents();

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-saffron">Welcome</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Almost there</h1>
        </header>
        <Card className="bg-white">
          <CardContent className="py-8 text-center">
            <GraduationCap className="mx-auto mb-3 size-8 text-mute" />
            <p className="text-sm font-medium text-ink">No students linked to this number yet.</p>
            <p className="mt-1 text-sm text-mute">Please contact the school office to complete the link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { start, end, label } = monthRange();
  const stats = await Promise.all(
    children.map(async (c) => {
      const rows = await getChildAttendance(c.studentId, start, end);
      const present = rows.filter((r) => r.status === "present").length;
      const absent = rows.filter((r) => r.status === "absent").length;
      const late = rows.filter((r) => r.status === "late").length;
      const total = present + absent + late;
      return { studentId: c.studentId, present, absent, late, total };
    }),
  );

  const announcements = await listAnnouncementsForParent();
  const recent = announcements.slice(0, 3);

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-saffron">{label}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {children.length === 1 ? `Welcome, ${children[0]!.firstName}’s parent` : "Welcome"}
        </h1>
        <p className="text-sm text-mute">Here&apos;s what&apos;s new for {children.length === 1 ? "your child" : "your children"} at school.</p>
      </header>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">Your {children.length > 1 ? "children" : "child"}</h2>
          <span className="text-xs text-mute">{children.length} student{children.length > 1 ? "s" : ""}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {children.map((c, i) => {
            const s = stats[i]!;
            const pct = s.total === 0 ? null : Math.round((s.present / s.total) * 100);
            return (
              <Card key={c.studentId} className="bg-white transition-shadow hover:shadow-sm">
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-saffron/15 font-display text-lg font-semibold text-saffron">
                      {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-semibold text-ink">{c.firstName} {c.lastName}</p>
                      <p className="truncate text-xs text-mute">
                        {c.admissionNo}{c.className ? ` · Grade ${c.className}` : ""}{c.sectionName ? ` · Sec ${c.sectionName}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-cream p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-mute">This month&apos;s attendance</span>
                      {pct !== null && (
                        <span className={cn(
                          "text-xs font-semibold",
                          pct >= 90 ? "text-emerald-700" : pct >= 75 ? "text-amber-700" : "text-rose-700",
                        )}>
                          {pct}%
                        </span>
                      )}
                    </div>
                    {s.total === 0 ? (
                      <p className="text-xs text-mute">No attendance recorded yet this month.</p>
                    ) : (
                      <div className="flex gap-3 text-xs">
                        <span><span className="font-semibold text-emerald-700">{s.present}</span> <span className="text-mute">present</span></span>
                        <span><span className="font-semibold text-rose-700">{s.absent}</span> <span className="text-mute">absent</span></span>
                        <span><span className="font-semibold text-amber-700">{s.late}</span> <span className="text-mute">late</span></span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 text-xs">
                    <Link
                      href={`/parent/attendance?child=${c.studentId}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5 font-medium text-ink transition-colors hover:bg-ink/10"
                    >
                      <Calendar className="size-3.5" /> Attendance
                    </Link>
                    <Link
                      href={`/parent/announcements?child=${c.studentId}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5 font-medium text-ink transition-colors hover:bg-ink/10"
                    >
                      <Megaphone className="size-3.5" /> Notices
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ink/70">Latest notices</h2>
          <Link href="/parent/announcements" className="text-xs font-medium text-saffron hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="py-6 text-center">
              <Megaphone className="mx-auto mb-2 size-6 text-mute" />
              <p className="text-sm text-mute">No notices from the school yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recent.map((a) => (
              <Link
                key={a.id}
                href="/parent/announcements"
                className="block"
              >
                <Card className="bg-white transition-shadow hover:shadow-sm">
                  <CardContent className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-saffron/15 text-saffron">
                      <Megaphone className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm text-ink">{a.body}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-mute">
                        {timeAgo(new Date(a.sentAt))} · {a.audienceType}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-mute" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
