import { eq, inArray } from "drizzle-orm";
import type { DB } from "./db";
import { announcement } from "./db/schema/communications";
import { parent, parentStudent, student } from "./db/schema/people";
import { section } from "./db/schema/academic";
import { notifier as defaultNotifier } from "./notifier";
import type { Notifier } from "./notifier/types";

export type AudienceType = "school" | "class" | "section" | "students";
export type AudienceRef =
  | null
  | { classId: string }
  | { sectionId: string }
  | { studentIds: string[] };

export interface SendAnnouncementInput {
  sentBy: string;
  audienceType: AudienceType;
  audienceRef: AudienceRef;
  body: string;
}

export interface SendAnnouncementResult {
  announcementId: string;
  recipientCount: number;
  notified: number;
  failed: number;
}

export async function sendAnnouncement(
  db: DB,
  input: SendAnnouncementInput,
  notifier: Notifier = defaultNotifier,
): Promise<SendAnnouncementResult> {
  const phones = await resolveAudiencePhones(db, input.audienceType, input.audienceRef);
  const unique = Array.from(new Set(phones));

  const [created] = await db.insert(announcement).values({
    sentBy: input.sentBy,
    audienceType: input.audienceType,
    audienceRef: input.audienceRef as object | null,
    body: input.body,
    recipientCount: unique.length,
  }).returning();
  if (!created) throw new Error("announcement insert failed");

  let notified = 0, failed = 0;
  for (const phone of unique) {
    const result = await notifier.sendAnnouncement(phone, input.body, { type: "announcement", id: created.id });
    if (result.status === "sent" || result.status === "stub_sent") notified++;
    else failed++;
  }

  return { announcementId: created.id, recipientCount: unique.length, notified, failed };
}

async function resolveAudiencePhones(db: DB, type: AudienceType, ref: AudienceRef): Promise<string[]> {
  if (type === "school") {
    const rows = await db.select({ phone: parent.phone }).from(parent);
    return rows.map((r) => r.phone);
  }
  if (type === "class") {
    if (!ref || !("classId" in ref)) throw new Error("class audience requires classId");
    const rows = await db
      .select({ phone: parent.phone })
      .from(parentStudent)
      .innerJoin(parent, eq(parent.id, parentStudent.parentId))
      .innerJoin(student, eq(student.id, parentStudent.studentId))
      .innerJoin(section, eq(section.id, student.currentSectionId))
      .where(eq(section.classId, ref.classId));
    return rows.map((r) => r.phone);
  }
  if (type === "section") {
    if (!ref || !("sectionId" in ref)) throw new Error("section audience requires sectionId");
    const rows = await db
      .select({ phone: parent.phone })
      .from(parentStudent)
      .innerJoin(parent, eq(parent.id, parentStudent.parentId))
      .innerJoin(student, eq(student.id, parentStudent.studentId))
      .where(eq(student.currentSectionId, ref.sectionId));
    return rows.map((r) => r.phone);
  }
  if (type === "students") {
    if (!ref || !("studentIds" in ref) || ref.studentIds.length === 0) return [];
    const rows = await db
      .select({ phone: parent.phone })
      .from(parentStudent)
      .innerJoin(parent, eq(parent.id, parentStudent.parentId))
      .where(inArray(parentStudent.studentId, ref.studentIds));
    return rows.map((r) => r.phone);
  }
  return [];
}
