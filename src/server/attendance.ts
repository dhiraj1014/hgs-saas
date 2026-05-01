"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema/communications";
import { student, teacherAssignment } from "@/lib/db/schema/people";
import { section, class_, academicYear } from "@/lib/db/schema/academic";
import { markAttendance, type MarkAttendanceInput } from "@/lib/attendance-core";
import { requireAbility } from "./session";
import type { Role } from "@/lib/permissions";

const entrySchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(["present", "absent", "late"]),
  notes: z.string().optional(),
});

const inputSchema = z.object({
  sectionId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z.array(entrySchema).min(1),
});

export async function getAssignedSections() {
  const session = await requireAbility("attendance.mark");
  const role = (session.user as { role: Role }).role;
  if (role === "super_admin" || role === "principal") {
    return db
      .select({ id: section.id, name: section.name, className: class_.name })
      .from(section)
      .leftJoin(class_, eq(class_.id, section.classId))
      .innerJoin(academicYear, eq(academicYear.id, section.academicYearId))
      .where(eq(academicYear.isCurrent, true))
      .orderBy(asc(class_.order), asc(section.name));
  }
  return db
    .select({ id: section.id, name: section.name, className: class_.name })
    .from(teacherAssignment)
    .innerJoin(section, eq(section.id, teacherAssignment.sectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .innerJoin(academicYear, eq(academicYear.id, section.academicYearId))
    .where(and(eq(teacherAssignment.userId, session.user.id), eq(academicYear.isCurrent, true)))
    .orderBy(asc(class_.order), asc(section.name));
}

export async function getSectionAttendance(sectionId: string, date: string) {
  await requireAbility("attendance.mark");
  // Defense-in-depth: confirm caller can access this section
  const allowed = await getAssignedSections();
  if (!allowed.find((s) => s.id === sectionId)) throw new Error("Section not accessible");

  const students = await db
    .select({ id: student.id, admissionNo: student.admissionNo, firstName: student.firstName, lastName: student.lastName })
    .from(student)
    .where(eq(student.currentSectionId, sectionId))
    .orderBy(asc(student.admissionNo));
  const existing = await db
    .select({ studentId: attendance.studentId, status: attendance.status })
    .from(attendance)
    .where(and(eq(attendance.sectionId, sectionId), eq(attendance.date, date)));
  const statusMap = new Map(existing.map((e) => [e.studentId, e.status]));
  return students.map((s) => ({ ...s, status: statusMap.get(s.id) ?? null }));
}

export async function submitAttendance(formInput: unknown) {
  const session = await requireAbility("attendance.mark");
  const data = inputSchema.parse(formInput);
  // Defense-in-depth: confirm caller can mark this section
  const allowed = await getAssignedSections();
  if (!allowed.find((s) => s.id === data.sectionId)) throw new Error("Section not accessible");

  const result = await markAttendance(db, { ...data, markerId: session.user.id } satisfies MarkAttendanceInput);
  revalidatePath("/attendance");
  return result;
}

export async function listAttendanceByDate(date: string) {
  await requireAbility("attendance.view-all");
  return db
    .select({
      studentId: student.id, admissionNo: student.admissionNo,
      firstName: student.firstName, lastName: student.lastName,
      sectionName: section.name, className: class_.name,
      status: attendance.status,
    })
    .from(attendance)
    .innerJoin(student, eq(student.id, attendance.studentId))
    .innerJoin(section, eq(section.id, attendance.sectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .where(eq(attendance.date, date))
    .orderBy(asc(class_.order), asc(section.name), asc(student.admissionNo));
}
