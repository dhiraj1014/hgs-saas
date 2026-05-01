"use server";

import { desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { announcement } from "@/lib/db/schema/communications";
import { sendAnnouncement, type SendAnnouncementInput } from "@/lib/announcement-core";
import { requireAbility, requireParent } from "./session";
import { getLinkedStudents } from "./parent";
import { section } from "@/lib/db/schema/academic";
import { student } from "@/lib/db/schema/people";

const inputSchema = z.discriminatedUnion("audienceType", [
  z.object({ audienceType: z.literal("school"), body: z.string().min(1) }),
  z.object({ audienceType: z.literal("class"), classId: z.string().uuid(), body: z.string().min(1) }),
  z.object({ audienceType: z.literal("section"), sectionId: z.string().uuid(), body: z.string().min(1) }),
  z.object({ audienceType: z.literal("students"), studentIds: z.array(z.string().uuid()).min(1), body: z.string().min(1) }),
]);

export async function submitAnnouncement(formInput: unknown) {
  const session = await requireAbility("announcements.send");
  const data = inputSchema.parse(formInput);
  if (data.audienceType === "school") await requireAbility("announcements.send-school-wide");

  const ref =
    data.audienceType === "school" ? null :
    data.audienceType === "class" ? { classId: data.classId } :
    data.audienceType === "section" ? { sectionId: data.sectionId } :
    { studentIds: data.studentIds };

  const result = await sendAnnouncement(db, {
    sentBy: session.user.id,
    audienceType: data.audienceType,
    audienceRef: ref,
    body: data.body,
  } satisfies SendAnnouncementInput);
  revalidatePath("/announcements");
  return result;
}

export async function listAnnouncements() {
  await requireAbility("announcements.view");
  return db.select().from(announcement).orderBy(desc(announcement.sentAt)).limit(50);
}

export async function listAnnouncementsForParent() {
  await requireParent();
  const linked = await getLinkedStudents();
  if (linked.length === 0) return [];
  // Build set of (classId, sectionId, studentId) the parent's children belong to
  const studentIds = linked.map((l) => l.studentId);
  const sectionRows = await db
    .select({ sectionId: student.currentSectionId, classId: section.classId })
    .from(student)
    .leftJoin(section, eq(section.id, student.currentSectionId))
    .where(inArray(student.id, studentIds));
  const sectionIds = sectionRows.map((r) => r.sectionId).filter(Boolean) as string[];
  const classIds = sectionRows.map((r) => r.classId).filter(Boolean) as string[];

  const items = await db
    .select()
    .from(announcement)
    .orderBy(desc(announcement.sentAt))
    .limit(100);
  // Filter in-app: simpler than building the JSONB filter SQL
  return items.filter((a) => {
    if (a.audienceType === "school") return true;
    const ref = a.audienceRef as { classId?: string; sectionId?: string; studentIds?: string[] } | null;
    if (a.audienceType === "class") return !!ref?.classId && classIds.includes(ref.classId);
    if (a.audienceType === "section") return !!ref?.sectionId && sectionIds.includes(ref.sectionId);
    if (a.audienceType === "students") return Array.isArray(ref?.studentIds) && ref.studentIds.some((id) => studentIds.includes(id));
    return false;
  });
}
