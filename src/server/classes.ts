"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { class_, section, academicYear } from "@/lib/db/schema/academic";
import { requireAbility } from "./session";

const classSchema = z.object({ name: z.string().min(1), order: z.coerce.number().int() });
const sectionSchema = z.object({
  classId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  name: z.string().min(1),
  capacity: z.coerce.number().int().optional(),
});

export async function listClassesWithSections() {
  await requireAbility("classes.manage");
  const current = await db.select().from(academicYear).where(eq(academicYear.isCurrent, true)).limit(1);
  const yearId = current[0]?.id;
  const classes = await db.select().from(class_).orderBy(asc(class_.order));
  const sections = yearId
    ? await db.select().from(section).where(eq(section.academicYearId, yearId))
    : [];
  return {
    currentYear: current[0] ?? null,
    classes: classes.map((c) => ({ ...c, sections: sections.filter((s) => s.classId === c.id) })),
  };
}

export async function createClass(input: unknown) {
  await requireAbility("classes.manage");
  const data = classSchema.parse(input);
  await db.insert(class_).values(data);
  revalidatePath("/classes");
}

export async function createSection(input: unknown) {
  await requireAbility("classes.manage");
  const data = sectionSchema.parse(input);
  await db.insert(section).values(data);
  revalidatePath("/classes");
}
