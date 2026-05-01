import { date, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { student, parent } from "./people";
import { section } from "./academic";
import { user } from "./auth";

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => student.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id").notNull().references(() => section.id),
    date: date("date").notNull(),
    status: text("status").notNull(),
    markedBy: text("marked_by").notNull().references(() => user.id),
    markedAt: timestamp("marked_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
  },
  (t) => [
    unique("attendance_student_date_unique").on(t.studentId, t.date),
    index("idx_attendance_section_date").on(t.sectionId, t.date),
    index("idx_attendance_student_date").on(t.studentId, t.date),
  ],
);

export const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channel: text("channel").notNull(),
    templateKey: text("template_key").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    recipientParentId: uuid("recipient_parent_id").references(() => parent.id, { onDelete: "set null" }),
    status: text("status").notNull(),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    errorMessage: text("error_message"),
    relatedEntityType: text("related_entity_type"),
    relatedEntityId: uuid("related_entity_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_notif_log_phone_created").on(t.recipientPhone, t.createdAt),
    index("idx_notif_log_related").on(t.relatedEntityType, t.relatedEntityId),
  ],
);

export const announcement = pgTable(
  "announcement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sentBy: text("sent_by").notNull().references(() => user.id),
    audienceType: text("audience_type").notNull(),
    audienceRef: jsonb("audience_ref"),
    body: text("body").notNull(),
    recipientCount: integer("recipient_count").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_announcement_sent_at").on(t.sentAt)],
);

export const otpAttempt = pgTable(
  "otp_attempt",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_otp_attempt_phone_time").on(t.phone, t.attemptedAt)],
);
