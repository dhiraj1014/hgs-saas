"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { student, parent, parentStudent } from "@/lib/db/schema/people";
import { class_, section } from "@/lib/db/schema/academic";
import { permittedStudentIds } from "@/lib/student-scoping";
import { requireAbility } from "./session";
import type { Role } from "@/lib/permissions";
import { parseWorkbook } from "@/lib/excel/parse";
import { validateStudentRows, commitStudentRows, type RawRow } from "@/lib/excel/students-importer";

const studentSchema = z.object({
  admissionNo: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  currentSectionId: z.string().uuid().optional(),
  dateOfAdmission: z.string().optional(),
});

const parentEntry = z.object({
  fullName: z.string().min(1),
  phone: z.string().regex(/^\+?\d{10,15}$/),
  email: z.string().email().optional().or(z.literal("")),
  relationToStudent: z.string().optional(),
  isPrimaryContact: z.boolean().optional(),
});

export async function listStudents(filter?: { sectionId?: string }) {
  const session = await requireAbility("students.view");
  const allowed = await permittedStudentIds(db, { userId: session.user.id, role: (session.user as { role: Role }).role });
  if (allowed.size === 0) return [];

  const conditions = [inArray(student.id, [...allowed])];
  if (filter?.sectionId) conditions.push(eq(student.currentSectionId, filter.sectionId));

  return db
    .select({
      id: student.id, admissionNo: student.admissionNo, firstName: student.firstName, lastName: student.lastName,
      sectionName: section.name, className: class_.name, status: student.status,
    })
    .from(student)
    .leftJoin(section, eq(section.id, student.currentSectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .where(and(...conditions))
    .orderBy(asc(student.admissionNo));
}

export async function listSectionsForFilter() {
  await requireAbility("students.view");
  return db
    .select({ id: section.id, name: section.name, className: class_.name })
    .from(section)
    .leftJoin(class_, eq(class_.id, section.classId));
}

export async function createStudent(input: unknown, parents: unknown[] = []) {
  await requireAbility("students.create");
  const data = studentSchema.parse(input);
  const parentList = z.array(parentEntry).parse(parents);

  await db.transaction(async (tx) => {
    const [created] = await tx.insert(student).values(data).returning();
    if (!created) throw new Error("Insert failed");
    for (const p of parentList) {
      let parentRow = (await tx.select().from(parent).where(eq(parent.phone, p.phone)).limit(1))[0];
      if (!parentRow) {
        [parentRow] = await tx.insert(parent).values({
          fullName: p.fullName,
          phone: p.phone,
          email: p.email || null,
          relationToStudent: p.relationToStudent ?? null,
        }).returning();
      }
      await tx.insert(parentStudent).values({
        parentId: parentRow!.id,
        studentId: created.id,
        isPrimaryContact: p.isPrimaryContact ?? false,
      });
    }
  });
  revalidatePath("/students");
}

export async function previewImport(buffer: ArrayBuffer) {
  await requireAbility("students.import");
  const rows = parseWorkbook(buffer) as RawRow[];
  const sections = await db
    .select({ id: section.id, name: section.name, className: class_.name })
    .from(section)
    .leftJoin(class_, eq(class_.id, section.classId));
  const knownSections = new Map(sections.map((s) => [`${s.className} · ${s.name}`, s.id]));
  return { rows: rows.length, ...validateStudentRows(rows, { knownSections }) };
}

export async function commitImport(buffer: ArrayBuffer) {
  await requireAbility("students.import");
  const rows = parseWorkbook(buffer) as RawRow[];
  const sections = await db
    .select({ id: section.id, name: section.name, className: class_.name })
    .from(section)
    .leftJoin(class_, eq(class_.id, section.classId));
  const knownSections = new Map(sections.map((s) => [`${s.className} · ${s.name}`, s.id]));
  const validation = validateStudentRows(rows, { knownSections });
  if (validation.errors.length > 0) {
    return { ok: false as const, errors: validation.errors, inserted: 0 };
  }
  const result = await commitStudentRows(db, validation.valid);
  return { ok: true as const, inserted: result.inserted, errors: [] };
}

export async function getStudent(id: string) {
  const session = await requireAbility("students.view");
  const allowed = await permittedStudentIds(db, { userId: session.user.id, role: (session.user as { role: Role }).role });
  if (!allowed.has(id)) throw new Error("Not found");

  const rows = await db
    .select({
      student: student, sectionName: section.name, className: class_.name,
    })
    .from(student)
    .leftJoin(section, eq(section.id, student.currentSectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .where(eq(student.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) throw new Error("Not found");

  const parents = await db
    .select({ id: parent.id, fullName: parent.fullName, phone: parent.phone, email: parent.email, relation: parent.relationToStudent, isPrimary: parentStudent.isPrimaryContact })
    .from(parentStudent)
    .innerJoin(parent, eq(parent.id, parentStudent.parentId))
    .where(eq(parentStudent.studentId, id));

  return { ...row, parents };
}
