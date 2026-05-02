import { db } from "@/lib/db";
import { class_, section } from "@/lib/db/schema/academic";
import { asc, eq } from "drizzle-orm";
import { requireAbility } from "@/server/session";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { AnnouncementComposer } from "@/components/staff/announcement-composer";
import { PageHeader } from "@/components/shared/page-header";

export default async function NewAnnouncementPage() {
  const session = await requireAbility("announcements.send");
  const role = (session.user as { role: Role }).role;
  const classes = await db
    .select({ id: class_.id, name: class_.name })
    .from(class_)
    .orderBy(asc(class_.order));
  const sections = await db
    .select({ id: section.id, name: section.name, className: class_.name })
    .from(section)
    .leftJoin(class_, eq(class_.id, section.classId))
    .orderBy(asc(class_.order), asc(section.name));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communications"
        title="New announcement"
        description="Pick an audience and compose your message — sent as SMS to parents."
      />
      <AnnouncementComposer
        classes={classes}
        sections={sections}
        allowSchoolWide={can(role, "announcements.send-school-wide")}
      />
    </div>
  );
}
