"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { parent, parentStudent, student } from "@/lib/db/schema/people";
import { class_, section } from "@/lib/db/schema/academic";
import { checkAndRecordOtp } from "@/lib/otp-rate-limit";
import { auth } from "@/lib/auth";
import { requireParent } from "./session";
import { notificationLog } from "@/lib/db/schema/communications";

export async function requestParentOtp(phone: string): Promise<{ ok: true }> {
  // Always return generic success — never leak which numbers are registered
  if (!/^\+91\d{10}$/.test(phone)) return { ok: true };
  const limit = await checkAndRecordOtp(db, phone);
  if (limit === "rate_limited") {
    await db.insert(notificationLog).values({
      channel: "sms", templateKey: "parent_otp", recipientPhone: phone,
      status: "rate_limited", provider: "stub",
    });
    return { ok: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (auth.api as any).sendPhoneNumberOTP({ body: { phoneNumber: phone } });
  return { ok: true };
}

export async function getLinkedStudents() {
  const session = await requireParent();
  const phone = (session.user as { phoneNumber?: string }).phoneNumber;
  if (!phone) return [];
  const parents = await db.select({ id: parent.id }).from(parent).where(eq(parent.phone, phone));
  if (parents.length === 0) return [];
  const links = await db
    .select({
      studentId: parentStudent.studentId,
      admissionNo: student.admissionNo,
      firstName: student.firstName, lastName: student.lastName,
      sectionName: section.name, className: class_.name,
    })
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .leftJoin(section, eq(section.id, student.currentSectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .where(inArray(parentStudent.parentId, parents.map((p) => p.id)));
  return links;
}
