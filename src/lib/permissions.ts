export type Role =
  | "super_admin"
  | "principal"
  | "office_staff"
  | "accountant"
  | "class_teacher"
  | "subject_teacher"
  | "parent";

export type Ability =
  | "students.create" | "students.edit" | "students.import" | "students.view"
  | "classes.manage" | "subjects.manage" | "academic-years.manage"
  | "users.manage"
  | "attendance.mark"
  | "marks.edit" | "marks.lock"
  | "fees.view" | "fees.refund"
  | "admissions.approve";

const grants: Record<Role, ReadonlyArray<Ability>> = {
  super_admin: [
    "students.create", "students.edit", "students.import", "students.view",
    "classes.manage", "subjects.manage", "academic-years.manage", "users.manage",
    "attendance.mark", "marks.edit", "marks.lock",
    "fees.view", "fees.refund", "admissions.approve",
  ],
  principal: [
    "students.view", "marks.lock", "admissions.approve", "fees.view",
  ],
  office_staff: [
    "students.create", "students.edit", "students.import", "students.view",
    "classes.manage", "subjects.manage", "academic-years.manage",
    "fees.view", "admissions.approve",
  ],
  accountant: ["fees.view", "fees.refund", "students.view"],
  class_teacher: ["attendance.mark", "students.view"],
  subject_teacher: ["marks.edit", "students.view"],
  parent: [],
};

export function can(role: Role, ability: Ability): boolean {
  return grants[role]?.includes(ability) ?? false;
}
