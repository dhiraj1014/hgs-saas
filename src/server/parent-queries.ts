import { cache } from "react";
import { eq, inArray, and, gte, lte, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { parent, parentStudent, student } from "@/lib/db/schema/people";
import { class_, section } from "@/lib/db/schema/academic";
import { attendance } from "@/lib/db/schema/communications";
import { requireParent } from "./session";

export type LinkedStudent = {
  studentId: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  sectionName: string | null;
  className: string | null;
};

export const getLinkedStudents = cache(async (): Promise<LinkedStudent[]> => {
  const session = await requireParent();
  const phone = (session.user as { phoneNumber?: string }).phoneNumber;
  if (!phone) return [];
  const parents = await db.select({ id: parent.id }).from(parent).where(eq(parent.phone, phone));
  if (parents.length === 0) return [];
  return db
    .select({
      studentId: parentStudent.studentId,
      admissionNo: student.admissionNo,
      firstName: student.firstName,
      lastName: student.lastName,
      sectionName: section.name,
      className: class_.name,
    })
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .leftJoin(section, eq(section.id, student.currentSectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .where(inArray(parentStudent.parentId, parents.map((p) => p.id)));
});

export async function getChildAttendance(studentId: string, monthStart: string, monthEnd: string) {
  await requireParent();
  const linked = await getLinkedStudents();
  if (!linked.find((s) => s.studentId === studentId)) throw new Error("Not found");
  return db
    .select({ date: attendance.date, status: attendance.status })
    .from(attendance)
    .where(and(eq(attendance.studentId, studentId), gte(attendance.date, monthStart), lte(attendance.date, monthEnd)))
    .orderBy(asc(attendance.date));
}
