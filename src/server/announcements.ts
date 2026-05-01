"use server";

import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { announcement } from "@/lib/db/schema/communications";
import { sendAnnouncement, type SendAnnouncementInput } from "@/lib/announcement-core";
import { requireAbility } from "./session";

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
