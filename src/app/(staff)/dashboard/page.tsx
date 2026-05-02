import Link from "next/link";
import { count, eq, desc } from "drizzle-orm";
import {
  Users,
  Layers,
  Megaphone,
  CalendarCheck,
  ArrowUpRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { student, parent } from "@/lib/db/schema/people";
import { section, academicYear } from "@/lib/db/schema/academic";
import { announcement, attendance } from "@/lib/db/schema/communications";
import { requireSession } from "@/server/session";
import { getAssignedSections } from "@/server/attendance";
import { can, type Role } from "@/lib/permissions";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AccessDeniedToast } from "@/components/staff/access-denied-toast";
import { cn } from "@/lib/utils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const session = await requireSession();
  const role = session.user.role as Role;
  const today = todayIso();

  const canSeeStudents = can(role, "students.view");
  const canViewAllAttendance = can(role, "attendance.view-all");
  const canMarkAttendance = can(role, "attendance.mark");
  const canSeeAnnouncements = can(role, "announcements.view");

  // Run only the queries this role is allowed to see.
  const currentYearRows = await db.select().from(academicYear).where(eq(academicYear.isCurrent, true)).limit(1);
  const currentYear = currentYearRows[0];

  const [studentCount, parentCount, sectionCount] = canSeeStudents
    ? await Promise.all([
        db.select({ n: count() }).from(student),
        db.select({ n: count() }).from(parent),
        db
          .select({ n: count() })
          .from(section)
          .innerJoin(academicYear, eq(academicYear.id, section.academicYearId))
          .where(eq(academicYear.isCurrent, true)),
      ])
    : [null, null, null];

  const announcementCount = canSeeAnnouncements
    ? (await db.select({ n: count() }).from(announcement))[0]?.n ?? 0
    : null;

  const todaysAttendance = canViewAllAttendance
    ? await db.select({ status: attendance.status }).from(attendance).where(eq(attendance.date, today))
    : null;
  const present = todaysAttendance?.filter((r) => r.status === "present").length ?? 0;
  const absent = todaysAttendance?.filter((r) => r.status === "absent").length ?? 0;
  const late = todaysAttendance?.filter((r) => r.status === "late").length ?? 0;
  const totalMarked = present + absent + late;

  // For non-admin teachers, show the sections they personally teach.
  const myAssignedSections = canMarkAttendance && !canViewAllAttendance ? await getAssignedSections() : null;

  const recentAnnouncements = canSeeAnnouncements
    ? await db.select().from(announcement).orderBy(desc(announcement.sentAt)).limit(3)
    : [];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const name = session.user.name?.split(" ")[0] ?? session.user.email?.split("@")[0] ?? "there";

  const description = canViewAllAttendance
    ? "Today at a glance — student counts, today's attendance, and recent announcements."
    : canMarkAttendance
      ? "Your sections and the latest announcements from the school."
      : "Latest announcements and updates.";

  return (
    <div className="space-y-8">
      <Suspense fallback={null}><AccessDeniedToast /></Suspense>
      <PageHeader
        eyebrow={currentYear?.name ?? "—"}
        title={`${greeting}, ${name}`}
        description={description}
      />

      {canSeeStudents && studentCount && parentCount && sectionCount && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Students" value={studentCount[0]?.n ?? 0} icon={Users} href={can(role, "students.view") ? "/students" : undefined} />
          <StatCard label="Sections (this year)" value={sectionCount[0]?.n ?? 0} icon={Layers} href={can(role, "classes.manage") ? "/classes" : undefined} />
          <StatCard label="Parents on record" value={parentCount[0]?.n ?? 0} icon={Users} />
          {announcementCount !== null && (
            <StatCard label="Announcements sent" value={announcementCount} icon={Megaphone} href="/announcements" />
          )}
        </section>
      )}

      <section className={cn("grid gap-4", canSeeAnnouncements && "lg:grid-cols-3")}>
        {canViewAllAttendance ? (
          <Card className="bg-white lg:col-span-2">
            <CardContent className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B26116]">Today, {today}</p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-ink">Attendance</h2>
                </div>
                <Link
                  href="/attendance/all"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#B26116] hover:underline"
                >
                  View all <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
              {totalMarked === 0 ? (
                <div className="rounded-lg bg-cream p-5 text-center">
                  <CalendarCheck className="mx-auto mb-2 size-6 text-mute" />
                  <p className="text-sm text-ink">No attendance marked yet today.</p>
                  {canMarkAttendance && (
                    <Link href="/attendance" className="mt-2 inline-block text-xs font-medium text-[#B26116] hover:underline">
                      Mark attendance →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <Tile label="Present" value={present} tone="emerald" />
                  <Tile label="Absent" value={absent} tone="rose" />
                  <Tile label="Late" value={late} tone="amber" />
                </div>
              )}
            </CardContent>
          </Card>
        ) : myAssignedSections && (
          <Card className="bg-white lg:col-span-2">
            <CardContent className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B26116]">Your sections</p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-ink">Mark attendance</h2>
                </div>
                <Link
                  href="/attendance"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#B26116] hover:underline"
                >
                  Open <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
              {myAssignedSections.length === 0 ? (
                <div className="rounded-lg bg-cream p-5 text-center">
                  <CalendarCheck className="mx-auto mb-2 size-6 text-mute" />
                  <p className="text-sm text-ink">You don't have any section assignments yet.</p>
                  <p className="mt-1 text-xs text-mute">Ask the office to assign you as class teacher of a section.</p>
                </div>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {myAssignedSections.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/attendance?section=${s.id}`}
                        className="flex items-center justify-between rounded-lg bg-cream px-3 py-2.5 transition-colors hover:bg-saffron/10"
                      >
                        <span className="text-sm font-medium text-ink">
                          {s.className} · Sec {s.name}
                        </span>
                        <ArrowUpRight className="size-4 text-mute" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {canSeeAnnouncements && (
          <Card className="bg-white">
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-base font-semibold text-ink">Recent announcements</h2>
                <Link href="/announcements" className="text-xs font-medium text-[#B26116] hover:underline">All</Link>
              </div>
              {recentAnnouncements.length === 0 ? (
                <p className="rounded-lg bg-cream p-4 text-center text-sm text-mute">None yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recentAnnouncements.map((a) => (
                    <li key={a.id} className="rounded-lg bg-cream p-3">
                      <p className="line-clamp-2 text-sm text-ink">{a.body}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-mute">
                        {new Date(a.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {a.audienceType}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const inner = (
    <Card size="sm" className="bg-white transition-shadow hover:shadow-sm">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">{label}</p>
          <p className="font-display text-2xl font-semibold text-ink">{value}</p>
        </div>
        <span className="grid size-9 place-items-center rounded-lg bg-saffron/10 text-[#B26116]">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Tile({ label, value, tone }: { label: string; value: number; tone: "emerald" | "rose" | "amber" }) {
  const toneClass =
    tone === "emerald" ? "text-emerald-700 bg-emerald-50 ring-emerald-100" :
    tone === "rose" ? "text-rose-700 bg-rose-50 ring-rose-100" :
    "text-amber-700 bg-amber-50 ring-amber-100";
  return (
    <div className={cn("rounded-lg p-4 ring-1 ring-inset", toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
