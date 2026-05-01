import { boolean, date, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { studentStatusEnum, teacherRoleInSectionEnum } from "./enums";
import { academicYear, section, subject } from "./academic";
import { user } from "./auth";

export const student = pgTable("student", {
  id: uuid("id").primaryKey().defaultRandom(),
  admissionNo: text("admission_no").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dob: date("dob"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  photoUrl: text("photo_url"),
  address: text("address"),
  currentSectionId: uuid("current_section_id").references(() => section.id),
  status: studentStatusEnum("status").notNull().default("active"),
  dateOfAdmission: date("date_of_admission"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const parent = pgTable("parent", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  occupation: text("occupation"),
  relationToStudent: text("relation_to_student"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const parentStudent = pgTable("parent_student", {
  parentId: uuid("parent_id").notNull().references(() => parent.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => student.id, { onDelete: "cascade" }),
  isPrimaryContact: boolean("is_primary_contact").notNull().default(false),
}, (t) => [unique("parent_student_pk").on(t.parentId, t.studentId)]);

export const teacherAssignment = pgTable("teacher_assignment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  sectionId: uuid("section_id").notNull().references(() => section.id),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYear.id),
  roleInSection: teacherRoleInSectionEnum("role_in_section").notNull(),
  subjectId: uuid("subject_id").references(() => subject.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
