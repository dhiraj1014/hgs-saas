"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema/auth";
import { requireAbility } from "./session";

const newUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["super_admin", "principal", "office_staff", "accountant", "class_teacher", "subject_teacher"]),
  phoneNumber: z.string().optional(),
});

export async function listStaff() {
  await requireAbility("users.manage");
  return db.select({ id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive }).from(user);
}

export async function createStaffUser(input: unknown) {
  await requireAbility("users.manage");
  const data = newUserSchema.parse(input);
  const result = await auth.api.signUpEmail({
    body: { email: data.email, password: data.password, name: data.name, role: data.role, phoneNumber: data.phoneNumber },
  });
  if ("error" in result && result.error) {
    const err = result.error as { message?: string };
    throw new Error(err.message ?? "Failed to create user");
  }
  revalidatePath("/users");
}
