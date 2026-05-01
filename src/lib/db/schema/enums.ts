import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "super_admin",
  "principal",
  "office_staff",
  "accountant",
  "class_teacher",
  "subject_teacher",
  "parent",
]);

export const studentStatusEnum = pgEnum("student_status", [
  "active",
  "left",
  "graduated",
]);

export const teacherRoleInSectionEnum = pgEnum("teacher_role_in_section", [
  "class_teacher",
  "subject_teacher",
]);
