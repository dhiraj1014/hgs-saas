import Link from "next/link";
import { ArrowUpRight, Calendar } from "lucide-react";
import { getAssignedSections, getSectionAttendance } from "@/server/attendance";
import { requireSession } from "@/server/session";
import { can, type Role } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceGrid } from "@/components/staff/attendance-grid";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; date?: string }>;
}) {
  const session = await requireSession();
  const role = session.user.role as Role;
  const canViewAll = can(role, "attendance.view-all");

  const params = await searchParams;
  const sections = await getAssignedSections();
  const today = new Date().toISOString().slice(0, 10);
  const sectionId = params.section ?? sections[0]?.id;
  const date = params.date ?? today;

  const friendly = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  if (!sections.length) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Today" title="Attendance" description="Mark daily attendance for your sections." />
        <Card className="bg-white">
          <CardContent className="space-y-2 py-10 text-center">
            <Calendar className="mx-auto size-7 text-mute" />
            <p className="text-sm font-medium text-ink">No sections assigned to you</p>
            <p className="text-sm text-mute">Ask the office to assign you as class teacher of a section.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const students = sectionId ? await getSectionAttendance(sectionId, date) : [];
  const currentSection = sections.find((s) => s.id === sectionId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Section attendance"
        title="Attendance"
        description={friendly}
        action={canViewAll ? (
          <Link
            href="/attendance/all"
            className="inline-flex items-center gap-1.5 rounded-lg border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream"
          >
            Cross-section view <ArrowUpRight className="size-3.5" />
          </Link>
        ) : undefined}
      />

      <Card className="bg-white">
        <CardContent>
          <form className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">Section</span>
              <select
                name="section"
                defaultValue={sectionId}
                className="min-w-[180px] rounded-lg border border-rule bg-white px-3 py-1.5 text-sm focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.className} · Section {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">Date</span>
              <input
                type="date"
                name="date"
                defaultValue={date}
                className="rounded-lg border border-rule bg-white px-3 py-1.5 text-sm focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-cream transition-colors hover:bg-[#B26116]"
            >
              Load
            </button>
          </form>
        </CardContent>
      </Card>

      {sectionId && currentSection && (
        <AttendanceGrid
          sectionId={sectionId}
          date={date}
          students={students}
          sectionLabel={`${currentSection.className} · Section ${currentSection.name}`}
        />
      )}
    </div>
  );
}
