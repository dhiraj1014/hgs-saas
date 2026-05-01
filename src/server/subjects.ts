"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { subject } from "@/lib/db/schema/academic";
import { requireAbility } from "./session";

const subjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});

export async function listSubjects() {
  await requireAbility("subjects.manage");
  return db.select().from(subject);
}

export async function createSubject(input: unknown) {
  await requireAbility("subjects.manage");
  const data = subjectSchema.parse(input);
  await db.insert(subject).values(data);
  revalidatePath("/subjects");
}
