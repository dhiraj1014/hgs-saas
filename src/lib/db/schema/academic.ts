import { boolean, date, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const academicYear = pgTable("academic_year", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),       // "2026-27"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const class_ = pgTable("class", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),       // "Grade 5"
  order: integer("order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const section = pgTable("section", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").notNull().references(() => class_.id),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYear.id),
  name: text("name").notNull(),                // "A", "B"
  classTeacherId: text("class_teacher_id").references(() => user.id),
  capacity: integer("capacity"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("section_uniq_class_year_name").on(t.classId, t.academicYearId, t.name),
]);

export const subject = pgTable("subject", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const classSubject = pgTable("class_subject", {
  classId: uuid("class_id").notNull().references(() => class_.id),
  subjectId: uuid("subject_id").notNull().references(() => subject.id),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYear.id),
}, (t) => [
  unique("class_subject_pk").on(t.classId, t.subjectId, t.academicYearId),
]);
