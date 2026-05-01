import { eq, inArray } from "drizzle-orm";
import { type DB } from "./db";
import { student, parent, parentStudent, teacherAssignment } from "./db/schema/people";
import { user } from "./db/schema/auth";
import { type Role } from "./permissions";

export type ScopingContext = { userId: string; role: Role };

/**
 * Returns the set of student IDs the given user is permitted to see.
 *
 * Phase 0 rules:
 *   super_admin / principal / office_staff / accountant → all students
 *   class_teacher → students in any section the user is assigned as class_teacher
 *   subject_teacher → students in any section the user teaches a subject in
 *   parent → students linked via parentStudent for this user's phone
 */
export async function permittedStudentIds(db: DB, ctx: ScopingContext): Promise<Set<string>> {
  if (ctx.role === "super_admin" || ctx.role === "principal" || ctx.role === "office_staff" || ctx.role === "accountant") {
    const rows = await db.select({ id: student.id }).from(student);
    return new Set(rows.map((r) => r.id));
  }

  if (ctx.role === "class_teacher" || ctx.role === "subject_teacher") {
    const assignments = await db
      .select({ sectionId: teacherAssignment.sectionId })
      .from(teacherAssignment)
      .where(eq(teacherAssignment.userId, ctx.userId));
    const sectionIds = assignments.map((a) => a.sectionId);
    if (sectionIds.length === 0) return new Set();
    const rows = await db
      .select({ id: student.id })
      .from(student)
      .where(inArray(student.currentSectionId, sectionIds));
    return new Set(rows.map((r) => r.id));
  }

  if (ctx.role === "parent") {
    const userRow = await db.select({ phone: user.phone }).from(user).where(eq(user.id, ctx.userId)).limit(1);
    const phone = userRow[0]?.phone;
    if (!phone) return new Set();
    const parentRows = await db.select({ id: parent.id }).from(parent).where(eq(parent.phone, phone));
    if (parentRows.length === 0) return new Set();
    const parentIds = parentRows.map((p) => p.id);
    const links = await db
      .select({ studentId: parentStudent.studentId })
      .from(parentStudent)
      .where(inArray(parentStudent.parentId, parentIds));
    return new Set(links.map((l) => l.studentId));
  }

  return new Set();
}
