"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { academicYear } from "@/lib/db/schema/academic";
import { requireAbility } from "./session";

const yearSchema = z.object({
  name: z.string().regex(/^\d{4}-\d{2}$/, "Format YYYY-YY (e.g., 2026-27)"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isCurrent: z.boolean().optional(),
});

export async function listAcademicYears() {
  await requireAbility("academic-years.manage");
  return db.select().from(academicYear).orderBy(academicYear.startDate);
}

export async function createAcademicYear(input: unknown) {
  await requireAbility("academic-years.manage");
  const data = yearSchema.parse(input);
  await db.transaction(async (tx) => {
    if (data.isCurrent) {
      await tx.update(academicYear).set({ isCurrent: false }).where(eq(academicYear.isCurrent, true));
    }
    await tx.insert(academicYear).values(data);
  });
  revalidatePath("/academic-years");
}

export async function setCurrentAcademicYear(id: string) {
  await requireAbility("academic-years.manage");
  await db.transaction(async (tx) => {
    await tx.update(academicYear).set({ isCurrent: false }).where(eq(academicYear.isCurrent, true));
    await tx.update(academicYear).set({ isCurrent: true }).where(eq(academicYear.id, id));
  });
  revalidatePath("/academic-years");
}
