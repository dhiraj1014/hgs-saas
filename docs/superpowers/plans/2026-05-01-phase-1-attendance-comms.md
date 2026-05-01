# HGS School SaaS — Phase 1 (Attendance + Parent Communication) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Class teachers mark daily attendance for assigned sections; absent/late students trigger parent SMS notifications (real for OTP, stubbed for attendance/announcements until DLT registration completes); principal/super-admin send targeted announcements; parents log in via phone-OTP and read child attendance + announcements + their own SMS history.

**Architecture:** Synchronous request handling, no queue infra. Attendance writes commit first, then notifications fan out sequentially post-commit (a notifier failure never rolls back attendance). Notifier abstraction with stub + MSG91 implementations selected per channel via env flags. Better Auth `phoneNumber` plugin for OTP auth; parent role linked to student records via phone match.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Tailwind 4, shadcn/ui, Drizzle ORM, Postgres (Neon), Better Auth (+ phoneNumber plugin), MSG91 (real OTP), Vitest + PGlite (unit/integration), Playwright (E2E), pnpm.

**Spec:** `docs/superpowers/specs/2026-05-01-phase-1-attendance-comms-design.md`

**Phase scope (in/out):**

- ✅ In: attendance schema + UI + post-commit fan-out, notification_log audit table, announcements (school/class/section/students audiences), notifier abstraction with stub + MSG91, parent OTP login (real SMS via MSG91), OTP rate-limit, parent route group + portal pages, sidebar/permissions extension, E2E coverage, production deploy.
- ❌ Out (deferred): WhatsApp, multi-session attendance (morning/afternoon), two-way messaging, leave applications, push notifications, announcement read receipts, attendance reports/analytics, DLT-approved attendance/announcement templates (sandbox sender used; OTP template already registered), monthly summaries, parent-editable phone.

---

## File Structure

```
hgs-saas/
├── drizzle/
│   └── 0001_phase_1_attendance_comms.sql   # generated
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── parent-login/
│   │   │       ├── page.tsx                # phone entry
│   │   │       └── verify/page.tsx         # OTP entry
│   │   ├── (parent)/
│   │   │   ├── layout.tsx                  # requireParent + ChildSwitcher in header
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── attendance/page.tsx
│   │   │   ├── announcements/page.tsx
│   │   │   └── notifications/page.tsx
│   │   └── (staff)/
│   │       ├── attendance/
│   │       │   ├── page.tsx                # class teacher: pick section + date → mark
│   │       │   └── all/page.tsx            # principal/super_admin: cross-section view
│   │       ├── announcements/
│   │       │   ├── page.tsx                # list of past announcements
│   │       │   └── new/page.tsx            # composer
│   │       └── notifications/page.tsx      # admin notification_log view
│   ├── components/
│   │   ├── parent/
│   │   │   ├── child-switcher.tsx
│   │   │   ├── attendance-card.tsx
│   │   │   ├── attendance-month-view.tsx
│   │   │   └── announcements-feed.tsx
│   │   └── staff/
│   │       ├── attendance-grid.tsx
│   │       ├── announcement-composer.tsx
│   │       ├── audience-picker.tsx
│   │       └── notification-log-table.tsx
│   ├── lib/
│   │   ├── db/schema/
│   │   │   └── communications.ts           # NEW: attendance, announcement, notification_log, otp_attempt
│   │   ├── notifier/
│   │   │   ├── index.ts                    # exported singleton + env routing + prod safety check
│   │   │   ├── types.ts                    # Notifier interface, Result, AttendanceAlertData
│   │   │   ├── stub.ts                     # writes notification_log only
│   │   │   └── msg91.ts                    # real HTTP impl
│   │   └── otp-rate-limit.ts               # sliding-window check using otp_attempt
│   ├── server/
│   │   ├── attendance.ts                   # mark, list, getAssignedSections
│   │   ├── announcements.ts                # send, list, audience resolution
│   │   ├── notifications.ts                # admin + parent log queries
│   │   ├── parent.ts                       # requestParentOtp, getLinkedStudents
│   │   └── session.ts                      # MODIFY: add requireParent
│   └── middleware.ts                       # MODIFY: gate /parent-login + /(parent) routes
├── tests/
│   ├── unit/
│   │   ├── permissions.test.ts             # MODIFY: add new abilities truth table
│   │   ├── student-scoping.test.ts         # MODIFY: rename column + extend parent cases
│   │   ├── attendance.test.ts              # NEW
│   │   ├── announcements.test.ts           # NEW
│   │   ├── otp-rate-limit.test.ts          # NEW
│   │   └── notifier/
│   │       ├── stub.test.ts                # NEW
│   │       ├── msg91.test.ts               # NEW
│   │       └── routing.test.ts             # NEW (env-flag routing in index.ts)
│   ├── e2e/
│   │   ├── attendance-marking.spec.ts      # NEW
│   │   ├── announcement-send.spec.ts       # NEW
│   │   └── parent-otp-flow.spec.ts         # NEW
│   └── helpers/
│       └── seed-test-school.ts             # MODIFY: emit a class_teacher with assigned section + parent rows
├── scripts/
│   └── seed.mts                            # MODIFY: emit parent role users + sample attendance
└── .env.example                            # MODIFY: MSG91 vars
```

---

## Setup

### Task 1: Branch + dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Create the working branch**

```bash
git checkout main
git pull
git checkout -b phase-1-attendance-comms
```

- [ ] **Step 2: Install Better Auth phoneNumber plugin dep**

The `better-auth` package already includes plugins; no new install needed. Confirm version supports `phoneNumber`:

```bash
pnpm list better-auth
```

Expected: `better-auth ^1.6.x` (or higher). If pre-1.6, run `pnpm add better-auth@latest` first.

- [ ] **Step 3: Confirm dev server still runs**

```bash
pnpm dev
```

Expected: starts on :3000, login page renders. Stop the server (Ctrl+C) before continuing.

- [ ] **Step 4: Commit branch marker**

```bash
git commit --allow-empty -m "chore: start phase-1-attendance-comms branch"
```

---

## Slice 1: Schema + migrations

### Task 2: Add communications schema file

**Files:**
- Create: `src/lib/db/schema/communications.ts`
- Modify: `src/lib/db/schema/index.ts`

- [ ] **Step 1: Create the new schema file**

Write `src/lib/db/schema/communications.ts`:

```ts
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
```

- [ ] **Step 2: Re-export from schema index**

Modify `src/lib/db/schema/index.ts` — append:

```ts
export * from "./communications";
```

(Keep existing re-exports.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema/communications.ts src/lib/db/schema/index.ts
git -c commit.gpgsign=false commit -m "feat(schema): add attendance, announcement, notification_log, otp_attempt"
```

### Task 3: Rename user.phone → user.phoneNumber, add phoneNumberVerified

**Files:**
- Modify: `src/lib/db/schema/auth.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/student-scoping.ts`

- [ ] **Step 1: Update auth schema**

Modify `src/lib/db/schema/auth.ts` — change the `user` table:

```ts
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // domain extensions
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified").notNull().default(false),
  role: roleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Update Better Auth additionalFields**

Modify `src/lib/auth.ts` — replace the `additionalFields` block:

```ts
  user: {
    additionalFields: {
      phoneNumber: { type: "string", required: false },
      phoneNumberVerified: { type: "boolean", required: false, defaultValue: false },
      role: { type: "string", required: true },
      isActive: { type: "boolean", required: false, defaultValue: true },
    },
  },
```

- [ ] **Step 3: Update student-scoping to use phoneNumber**

Modify `src/lib/student-scoping.ts:39` — change the parent-role lookup:

```ts
  if (ctx.role === "parent") {
    const userRow = await db.select({ phone: user.phoneNumber }).from(user).where(eq(user.id, ctx.userId)).limit(1);
    const phone = userRow[0]?.phone;
    if (!phone) return new Set();
    const parentRows = await db.select({ id: parent.id }).from(parent).where(eq(parent.phone, phone));
    if (parentRows.length === 0) return new Set();
    const parentIds = parentRows.map((p) => p.id);
    const links = await db
      .select({ studentId: parentStudent.studentId })
      .from(parentStudent)
      .where(inArray(parentStudent.parentId, parentIds));
    return new Set(links.map((l) => l.studentId));
  }
```

- [ ] **Step 4: Find and update any other code referring to user.phone**

```bash
grep -rn "user\.phone[^N]" src/ scripts/ tests/ --include="*.ts" --include="*.tsx" --include="*.mts"
```

For each match, replace `user.phone` with `user.phoneNumber`. Likely candidates: `src/server/users.ts`, `src/components/staff/user-form.tsx`, `scripts/seed.mts`, `tests/unit/student-scoping.test.ts`.

- [ ] **Step 5: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: zero errors. Fix any that surface.

- [ ] **Step 6: Commit**

```bash
git add -u
git -c commit.gpgsign=false commit -m "refactor(auth): rename user.phone to phoneNumber, add phoneNumberVerified"
```

### Task 4: Generate + apply the migration

**Files:**
- Create: `drizzle/0001_phase_1_attendance_comms.sql` (auto-generated, then hand-edited)

- [ ] **Step 1: Generate migration**

```bash
pnpm drizzle-kit generate --name phase_1_attendance_comms
```

Expected: a new SQL file appears in `drizzle/`. Open it.

- [ ] **Step 2: Inspect and verify the rename is a RENAME, not DROP+ADD**

Drizzle sometimes emits `DROP COLUMN phone` followed by `ADD COLUMN phone_number` (which loses data). Open the generated SQL file. If you see `DROP COLUMN "phone"` near the user table changes, **edit the file** to replace those statements with:

```sql
ALTER TABLE "user" RENAME COLUMN "phone" TO "phone_number";
ALTER TABLE "user" ADD CONSTRAINT "user_phone_number_unique" UNIQUE ("phone_number");
ALTER TABLE "user" ADD COLUMN "phone_number_verified" boolean DEFAULT false NOT NULL;
```

If Drizzle correctly emitted a RENAME, leave it alone.

- [ ] **Step 3: Apply migration to local dev DB**

Ensure `.env.local` points at your dev branch, then:

```bash
cp .env.local .env  # drizzle-kit reads .env via dotenv/config
pnpm drizzle-kit migrate
```

Expected: "Migration applied successfully" or similar; no errors.

- [ ] **Step 4: Sanity check the new tables**

```bash
pnpm tsx scripts/count-rows.mts
```

Expected: list includes the 4 new tables (`attendance`, `notification_log`, `announcement`, `otp_attempt`) all with 0 rows. (You'll need to extend the table list in `count-rows.mts` to print them.)

- [ ] **Step 5: Update count-rows.mts**

Modify `scripts/count-rows.mts` — extend the `tables` array:

```ts
const tables = [
  "academic_year", "class", "section", "subject", "class_subject",
  "student", "parent", "parent_student", "teacher_assignment",
  "attendance", "announcement", "notification_log", "otp_attempt",
  '"user"', "session", "account", "verification",
];
```

Also update `scripts/wipe-all-data.mts` — extend the TRUNCATE list:

```ts
await client.unsafe(`
  TRUNCATE TABLE
    notification_log, announcement, otp_attempt,
    attendance,
    parent_student, parent, student,
    teacher_assignment, section, class_subject, subject, class, academic_year,
    account, session, verification, "user"
  RESTART IDENTITY CASCADE
`);
```

- [ ] **Step 6: Run again to confirm**

```bash
pnpm tsx scripts/count-rows.mts
```

Expected: all 4 new tables shown with `0`.

- [ ] **Step 7: Commit**

```bash
git add drizzle/0001_phase_1_attendance_comms.sql scripts/count-rows.mts scripts/wipe-all-data.mts
git -c commit.gpgsign=false commit -m "feat(db): apply phase-1 schema migration"
```

---

## Slice 2: Permissions extension

### Task 5: Add new abilities to permissions

**Files:**
- Modify: `src/lib/permissions.ts`
- Modify: `tests/unit/permissions.test.ts`

- [ ] **Step 1: Write failing tests for new abilities**

Append to `tests/unit/permissions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { can } from "@/lib/permissions";

describe("Phase 1 abilities", () => {
  it("class_teacher has attendance.mark", () => {
    expect(can("class_teacher", "attendance.mark")).toBe(true);
  });
  it("subject_teacher does not have attendance.mark", () => {
    expect(can("subject_teacher", "attendance.mark")).toBe(false);
  });
  it("super_admin has attendance.mark, attendance.view-all, announcements.send-school-wide", () => {
    expect(can("super_admin", "attendance.mark")).toBe(true);
    expect(can("super_admin", "attendance.view-all")).toBe(true);
    expect(can("super_admin", "announcements.send-school-wide")).toBe(true);
  });
  it("principal has announcements.send but not announcements.send-school-wide", () => {
    expect(can("principal", "announcements.send")).toBe(true);
    expect(can("principal", "announcements.send-school-wide")).toBe(false);
  });
  it("office_staff has attendance.view-all but not announcements.send", () => {
    expect(can("office_staff", "attendance.view-all")).toBe(true);
    expect(can("office_staff", "announcements.send")).toBe(false);
  });
  it("parent has attendance.view-own-children, announcements.view, notifications.view-own", () => {
    expect(can("parent", "attendance.view-own-children")).toBe(true);
    expect(can("parent", "announcements.view")).toBe(true);
    expect(can("parent", "notifications.view-own")).toBe(true);
  });
  it("parent does NOT have attendance.mark or notifications.view-all", () => {
    expect(can("parent", "attendance.mark")).toBe(false);
    expect(can("parent", "notifications.view-all")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify failures**

```bash
pnpm vitest run tests/unit/permissions.test.ts
```

Expected: 7 new test failures (TS errors on unknown ability strings, then assertion failures).

- [ ] **Step 3: Extend Ability type and grants table**

Modify `src/lib/permissions.ts`:

```ts
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
  | "attendance.mark" | "attendance.view-all" | "attendance.view-own-children"
  | "announcements.send" | "announcements.send-school-wide" | "announcements.view"
  | "notifications.view-all" | "notifications.view-own"
  | "marks.edit" | "marks.lock"
  | "fees.view" | "fees.refund"
  | "admissions.approve";

const grants: Record<Role, ReadonlyArray<Ability>> = {
  super_admin: [
    "students.create", "students.edit", "students.import", "students.view",
    "classes.manage", "subjects.manage", "academic-years.manage", "users.manage",
    "attendance.mark", "attendance.view-all",
    "announcements.send", "announcements.send-school-wide", "announcements.view",
    "notifications.view-all",
    "marks.edit", "marks.lock",
    "fees.view", "fees.refund", "admissions.approve",
  ],
  principal: [
    "students.view", "marks.lock", "admissions.approve", "fees.view",
    "attendance.mark", "attendance.view-all",
    "announcements.send", "announcements.view",
    "notifications.view-all",
  ],
  office_staff: [
    "students.create", "students.edit", "students.import", "students.view",
    "classes.manage", "subjects.manage", "academic-years.manage",
    "fees.view", "admissions.approve",
    "attendance.view-all",
  ],
  accountant: ["fees.view", "fees.refund", "students.view"],
  class_teacher: ["attendance.mark", "students.view", "announcements.view"],
  subject_teacher: ["marks.edit", "students.view"],
  parent: ["attendance.view-own-children", "announcements.view", "notifications.view-own"],
};

export function can(role: Role, ability: Ability): boolean {
  return grants[role]?.includes(ability) ?? false;
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
pnpm vitest run tests/unit/permissions.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions.ts tests/unit/permissions.test.ts
git -c commit.gpgsign=false commit -m "feat(perms): add attendance, announcements, notifications abilities"
```

### Task 6: Add requireParent helper

**Files:**
- Modify: `src/server/session.ts`

- [ ] **Step 1: Read existing session helper**

Read `src/server/session.ts` to confirm shape of `requireSession()` and `requireAbility()`. Below assumes the file exports `requireSession` returning `{ user: { id, role, ... } }`.

- [ ] **Step 2: Add requireParent**

Append to `src/server/session.ts`:

```ts
export async function requireParent() {
  const session = await requireSession();
  const role = (session.user as { role: string }).role;
  if (role !== "parent") {
    throw new Error("Parent role required");
  }
  return session;
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/session.ts
git -c commit.gpgsign=false commit -m "feat(auth): add requireParent helper"
```

### Task 7: Extend student-scoping tests for parent role

**Files:**
- Modify: `tests/unit/student-scoping.test.ts`

- [ ] **Step 1: Add parent-role test cases**

Open `tests/unit/student-scoping.test.ts`. The existing test setup likely uses `freshTestDb()` from `tests/helpers/pglite.ts`. Append these tests inside the existing `describe`:

```ts
import { permittedStudentIds } from "@/lib/student-scoping";
import { user } from "@/lib/db/schema/auth";
import { parent, parentStudent, student } from "@/lib/db/schema/people";

it("parent: phone matches parent row with 2 students → returns both ids", async () => {
  const { db } = await freshTestDb();
  await db.insert(user).values({
    id: "u-parent-1", email: "p1@t", name: "P1", role: "parent", phoneNumber: "+919000000001",
  });
  const [p] = await db.insert(parent).values({ fullName: "P", phone: "+919000000001" }).returning();
  if (!p) throw new Error("parent insert failed");
  // need a section first — re-use any existing seed helper, or create a minimal one inline
  // (assume seed-test-school helper is reusable)
  const s1 = await db.insert(student).values({ admissionNo: "T0001", firstName: "S1", lastName: "T" }).returning();
  const s2 = await db.insert(student).values({ admissionNo: "T0002", firstName: "S2", lastName: "T" }).returning();
  await db.insert(parentStudent).values({ parentId: p.id, studentId: s1[0]!.id, isPrimaryContact: true });
  await db.insert(parentStudent).values({ parentId: p.id, studentId: s2[0]!.id, isPrimaryContact: false });

  const result = await permittedStudentIds(db, { userId: "u-parent-1", role: "parent" });
  expect(result.size).toBe(2);
  expect(result.has(s1[0]!.id)).toBe(true);
  expect(result.has(s2[0]!.id)).toBe(true);
});

it("parent: no parent row matches phone → returns empty set", async () => {
  const { db } = await freshTestDb();
  await db.insert(user).values({
    id: "u-parent-2", email: "p2@t", name: "P2", role: "parent", phoneNumber: "+919000000099",
  });
  const result = await permittedStudentIds(db, { userId: "u-parent-2", role: "parent" });
  expect(result.size).toBe(0);
});

it("parent: parent row with 0 student links → returns empty set", async () => {
  const { db } = await freshTestDb();
  await db.insert(user).values({
    id: "u-parent-3", email: "p3@t", name: "P3", role: "parent", phoneNumber: "+919000000003",
  });
  await db.insert(parent).values({ fullName: "P3", phone: "+919000000003" });
  const result = await permittedStudentIds(db, { userId: "u-parent-3", role: "parent" });
  expect(result.size).toBe(0);
});
```

(If the existing test file uses a different seed pattern, adapt the inline inserts to match. The key assertions are the three behaviors above.)

- [ ] **Step 2: Run tests**

```bash
pnpm vitest run tests/unit/student-scoping.test.ts
```

Expected: all parent-role tests pass (Task 3 already updated the column rename, so `phoneNumber` access works).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/student-scoping.test.ts
git -c commit.gpgsign=false commit -m "test(scoping): cover parent role with phone-based linkage"
```

---

## Slice 3: Notifier abstraction

### Task 8: Notifier types and interface

**Files:**
- Create: `src/lib/notifier/types.ts`

- [ ] **Step 1: Write the types**

```ts
// src/lib/notifier/types.ts

export type TemplateKey = "parent_otp" | "attendance_absent" | "attendance_late" | "announcement";

export type NotificationStatus = "sent" | "stub_sent" | "failed" | "skipped_no_phone" | "rate_limited";

export interface NotificationResult {
  status: NotificationStatus;
  providerMessageId?: string;
  errorMessage?: string;
}

export interface AttendanceAlertData {
  studentName: string;
  date: string;       // formatted DD-MMM-YYYY
  status: "absent" | "late";
  sectionName: string;
}

export interface RelatedEntity {
  type: "attendance" | "announcement" | "parent_otp";
  id: string;
}

export interface Notifier {
  sendParentOtp(phone: string, code: string, related?: RelatedEntity): Promise<NotificationResult>;
  sendAttendanceAlert(phone: string, data: AttendanceAlertData, related?: RelatedEntity): Promise<NotificationResult>;
  sendAnnouncement(phone: string, body: string, related?: RelatedEntity): Promise<NotificationResult>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/notifier/types.ts
git -c commit.gpgsign=false commit -m "feat(notifier): define Notifier interface and types"
```

### Task 9: Stub notifier implementation + tests

**Files:**
- Create: `src/lib/notifier/stub.ts`
- Create: `tests/unit/notifier/stub.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/notifier/stub.test.ts
import { describe, it, expect } from "vitest";
import { freshTestDb } from "../../helpers/pglite";
import { createStubNotifier } from "@/lib/notifier/stub";
import { notificationLog } from "@/lib/db/schema/communications";

describe("stub notifier", () => {
  it("sendParentOtp writes a notification_log row with status=stub_sent and the code in providerMessageId", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    const result = await notifier.sendParentOtp("+919000000001", "123456");
    expect(result.status).toBe("stub_sent");
    const rows = await db.select().from(notificationLog);
    expect(rows.length).toBe(1);
    expect(rows[0]?.status).toBe("stub_sent");
    expect(rows[0]?.templateKey).toBe("parent_otp");
    expect(rows[0]?.recipientPhone).toBe("+919000000001");
    expect(rows[0]?.provider).toBe("stub");
    // Stub persists the OTP code in providerMessageId so E2E tests can fetch it.
    // Real MSG91 puts its request_id there; this is dev/test-only behavior.
    expect(rows[0]?.providerMessageId).toBe("123456");
  });

  it("sendAttendanceAlert writes a stub_sent row with related entity", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    const result = await notifier.sendAttendanceAlert(
      "+919000000002",
      { studentName: "S", date: "01-May-2026", status: "absent", sectionName: "Grade 1 · A" },
      { type: "attendance", id: "00000000-0000-0000-0000-000000000001" },
    );
    expect(result.status).toBe("stub_sent");
    const rows = await db.select().from(notificationLog);
    expect(rows[0]?.relatedEntityType).toBe("attendance");
    expect(rows[0]?.templateKey).toBe("attendance_absent");
  });

  it("sendAnnouncement writes a stub_sent row with template_key=announcement", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    await notifier.sendAnnouncement("+919000000003", "School closed tomorrow.");
    const rows = await db.select().from(notificationLog);
    expect(rows[0]?.templateKey).toBe("announcement");
    expect(rows[0]?.status).toBe("stub_sent");
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

```bash
pnpm vitest run tests/unit/notifier/stub.test.ts
```

Expected: import errors (stub.ts doesn't exist).

- [ ] **Step 3: Implement stub**

```ts
// src/lib/notifier/stub.ts
import type { DB } from "../db";
import { notificationLog } from "../db/schema/communications";
import type { Notifier, NotificationResult, AttendanceAlertData, RelatedEntity } from "./types";

export function createStubNotifier(db: DB): Notifier {
  async function log(args: {
    templateKey: "parent_otp" | "attendance_absent" | "attendance_late" | "announcement";
    phone: string;
    related?: RelatedEntity;
    /** Stub-only: persisted in providerMessageId so dev tools / E2E tests can read it. */
    debugPayload?: string;
  }): Promise<NotificationResult> {
    await db.insert(notificationLog).values({
      channel: "sms",
      templateKey: args.templateKey,
      recipientPhone: args.phone,
      status: "stub_sent",
      provider: "stub",
      providerMessageId: args.debugPayload,
      relatedEntityType: args.related?.type,
      relatedEntityId: args.related?.id,
    });
    return { status: "stub_sent" };
  }

  return {
    sendParentOtp(phone, code, related) {
      return log({ templateKey: "parent_otp", phone, related, debugPayload: code });
    },
    sendAttendanceAlert(phone, data, related) {
      return log({
        templateKey: data.status === "absent" ? "attendance_absent" : "attendance_late",
        phone,
        related,
      });
    },
    sendAnnouncement(phone, _body, related) {
      return log({ templateKey: "announcement", phone, related });
    },
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
pnpm vitest run tests/unit/notifier/stub.test.ts
```

Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifier/stub.ts tests/unit/notifier/stub.test.ts
git -c commit.gpgsign=false commit -m "feat(notifier): stub implementation + tests"
```

### Task 10: MSG91 implementation + tests

**Files:**
- Create: `src/lib/notifier/msg91.ts`
- Create: `tests/unit/notifier/msg91.test.ts`

- [ ] **Step 1: Write failing tests (mock fetch)**

```ts
// tests/unit/notifier/msg91.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { freshTestDb } from "../../helpers/pglite";
import { createMsg91Notifier } from "@/lib/notifier/msg91";
import { notificationLog } from "@/lib/db/schema/communications";

const config = {
  authKey: "test-key",
  senderId: "HGSPAT",
  templates: {
    parent_otp: "test-otp-template-id",
    attendance_absent: "test-att-template-id",
    attendance_late: "test-att-template-id",
    announcement: "test-ann-template-id",
  },
};

describe("msg91 notifier", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sendParentOtp: success writes status=sent and provider_message_id", async () => {
    const { db } = await freshTestDb();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ type: "success", request_id: "abc-123" }),
      { status: 200, headers: { "content-type": "application/json" } },
    )));
    const n = createMsg91Notifier(db, config);
    const result = await n.sendParentOtp("+919000000001", "123456");
    expect(result.status).toBe("sent");
    expect(result.providerMessageId).toBe("abc-123");
    const rows = await db.select().from(notificationLog);
    expect(rows[0]?.status).toBe("sent");
    expect(rows[0]?.provider).toBe("msg91");
    expect(rows[0]?.providerMessageId).toBe("abc-123");
  });

  it("sendParentOtp: 4xx writes status=failed with errorMessage", async () => {
    const { db } = await freshTestDb();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ type: "error", message: "Invalid phone number" }),
      { status: 400, headers: { "content-type": "application/json" } },
    )));
    const n = createMsg91Notifier(db, config);
    const result = await n.sendParentOtp("+919000000001", "123456");
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("Invalid phone number");
    const rows = await db.select().from(notificationLog);
    expect(rows[0]?.status).toBe("failed");
  });

  it("sendParentOtp: 5xx triggers single retry, second attempt succeeds", async () => {
    const { db } = await freshTestDb();
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls++;
      if (calls === 1) return new Response("oops", { status: 502 });
      return new Response(
        JSON.stringify({ type: "success", request_id: "xyz-789" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }));
    const n = createMsg91Notifier(db, config);
    const result = await n.sendParentOtp("+919000000001", "123456");
    expect(calls).toBe(2);
    expect(result.status).toBe("sent");
  });

  it("sendParentOtp: two consecutive 5xx → status=failed", async () => {
    const { db } = await freshTestDb();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("oops", { status: 503 })));
    const n = createMsg91Notifier(db, config);
    const result = await n.sendParentOtp("+919000000001", "123456");
    expect(result.status).toBe("failed");
  });

  it("sendAttendanceAlert: missing template id returns failed without calling fetch", async () => {
    const { db } = await freshTestDb();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const cfg = { ...config, templates: { ...config.templates, attendance_absent: "" } };
    const n = createMsg91Notifier(db, cfg);
    const result = await n.sendAttendanceAlert(
      "+919000000001",
      { studentName: "S", date: "01-May-2026", status: "absent", sectionName: "G1 · A" },
    );
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("template");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

```bash
pnpm vitest run tests/unit/notifier/msg91.test.ts
```

Expected: import errors.

- [ ] **Step 3: Implement msg91 notifier**

```ts
// src/lib/notifier/msg91.ts
import type { DB } from "../db";
import { notificationLog } from "../db/schema/communications";
import type { Notifier, NotificationResult, AttendanceAlertData, RelatedEntity, TemplateKey } from "./types";

export interface Msg91Config {
  authKey: string;
  senderId: string;
  templates: Record<TemplateKey, string>;
}

const ENDPOINT = "https://control.msg91.com/api/v5/flow/";
const TIMEOUT_MS = 10_000;

export function createMsg91Notifier(db: DB, config: Msg91Config): Notifier {
  async function send(args: {
    templateKey: TemplateKey;
    phone: string;
    variables: Record<string, string>;
    related?: RelatedEntity;
  }): Promise<NotificationResult> {
    const templateId = config.templates[args.templateKey];
    if (!templateId) {
      const errorMessage = `MSG91 template id not configured for ${args.templateKey}`;
      await db.insert(notificationLog).values({
        channel: "sms", templateKey: args.templateKey, recipientPhone: args.phone,
        status: "failed", provider: "msg91", errorMessage,
        relatedEntityType: args.related?.type, relatedEntityId: args.related?.id,
      });
      return { status: "failed", errorMessage };
    }

    const body = {
      template_id: templateId,
      sender: config.senderId,
      short_url: 0,
      recipients: [{ mobiles: args.phone.replace(/^\+/, ""), ...args.variables }],
    };

    const result = await sendWithRetry(config.authKey, body);

    await db.insert(notificationLog).values({
      channel: "sms", templateKey: args.templateKey, recipientPhone: args.phone,
      status: result.status, provider: "msg91",
      providerMessageId: result.providerMessageId,
      errorMessage: result.errorMessage,
      relatedEntityType: args.related?.type, relatedEntityId: args.related?.id,
    });

    return result;
  }

  return {
    sendParentOtp(phone, code, related) {
      return send({ templateKey: "parent_otp", phone, variables: { otp: code }, related });
    },
    sendAttendanceAlert(phone, data, related) {
      return send({
        templateKey: data.status === "absent" ? "attendance_absent" : "attendance_late",
        phone,
        variables: { name: data.studentName, date: data.date, section: data.sectionName },
        related,
      });
    },
    sendAnnouncement(phone, body, related) {
      return send({ templateKey: "announcement", phone, variables: { message: body }, related });
    },
  };
}

async function sendWithRetry(authKey: string, body: unknown): Promise<NotificationResult> {
  const first = await sendOnce(authKey, body);
  if (first.status === "sent" || first.errorClass !== "5xx") return toResult(first);
  const second = await sendOnce(authKey, body);
  return toResult(second);
}

type RawResult = {
  status: "sent" | "failed";
  providerMessageId?: string;
  errorMessage?: string;
  errorClass?: "4xx" | "5xx" | "timeout" | "network";
};

async function sendOnce(authKey: string, body: unknown): Promise<RawResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "authkey": authKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({})) as { request_id?: string };
      return { status: "sent", providerMessageId: data.request_id };
    }
    const text = await res.text().catch(() => "");
    return {
      status: "failed",
      errorMessage: `HTTP ${res.status}: ${text.slice(0, 200)}`,
      errorClass: res.status >= 500 ? "5xx" : "4xx",
    };
  } catch (e) {
    const isAbort = e instanceof Error && e.name === "AbortError";
    return {
      status: "failed",
      errorMessage: isAbort ? "MSG91 request timed out" : (e instanceof Error ? e.message : "MSG91 network error"),
      errorClass: isAbort ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timer);
  }
}

function toResult(r: RawResult): NotificationResult {
  return r.status === "sent"
    ? { status: "sent", providerMessageId: r.providerMessageId }
    : { status: "failed", errorMessage: r.errorMessage };
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run tests/unit/notifier/msg91.test.ts
```

Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifier/msg91.ts tests/unit/notifier/msg91.test.ts
git -c commit.gpgsign=false commit -m "feat(notifier): MSG91 implementation with retry and timeout"
```

### Task 11: Notifier index with env routing + production safety

**Files:**
- Create: `src/lib/notifier/index.ts`
- Create: `tests/unit/notifier/routing.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write failing tests for env routing**

```ts
// tests/unit/notifier/routing.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("notifier env routing", () => {
  beforeEach(() => {
    for (const k of Object.keys(process.env)) if (k.startsWith("MSG91_") || k === "NODE_ENV") delete process.env[k];
  });
  afterEach(() => {
    for (const k of Object.keys(process.env)) if (k.startsWith("MSG91_") || k === "NODE_ENV") delete process.env[k];
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("when MSG91_ENABLED_FOR_OTP=true and key set, OTP routes through msg91", async () => {
    process.env.NODE_ENV = "test";
    process.env.MSG91_AUTH_KEY = "k";
    process.env.MSG91_SENDER_ID = "HGSPAT";
    process.env.MSG91_TEMPLATE_ID_PARENT_OTP = "tid";
    process.env.MSG91_ENABLED_FOR_OTP = "true";
    const { resolveImpl } = await import("@/lib/notifier/index");
    expect(resolveImpl("parent_otp")).toBe("msg91");
  });

  it("when MSG91_ENABLED_FOR_OTP=false, OTP routes through stub", async () => {
    process.env.NODE_ENV = "test";
    process.env.MSG91_AUTH_KEY = "k";
    process.env.MSG91_ENABLED_FOR_OTP = "false";
    const { resolveImpl } = await import("@/lib/notifier/index");
    expect(resolveImpl("parent_otp")).toBe("stub");
  });

  it("attendance and announcement default to stub when flags unset", async () => {
    process.env.NODE_ENV = "test";
    const { resolveImpl } = await import("@/lib/notifier/index");
    expect(resolveImpl("attendance_absent")).toBe("stub");
    expect(resolveImpl("announcement")).toBe("stub");
  });

  it("NODE_ENV=production with no MSG91_AUTH_KEY throws on import", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.MSG91_AUTH_KEY;
    await expect(import(`@/lib/notifier/index?test=${Math.random()}`)).rejects.toThrow(/MSG91_AUTH_KEY/);
  });
});
```

Note: the cache-busting query param on the import is a workaround for Vitest module caching; if your Vitest config doesn't handle that you may need to use `vi.resetModules()` instead — adapt to whichever works.

- [ ] **Step 2: Run tests, verify fail**

```bash
pnpm vitest run tests/unit/notifier/routing.test.ts
```

Expected: import errors.

- [ ] **Step 3: Implement notifier/index.ts**

```ts
// src/lib/notifier/index.ts
import { db } from "../db";
import { createStubNotifier } from "./stub";
import { createMsg91Notifier, type Msg91Config } from "./msg91";
import type { Notifier, NotificationResult, AttendanceAlertData, RelatedEntity, TemplateKey } from "./types";

if (process.env.NODE_ENV === "production" && !process.env.MSG91_AUTH_KEY) {
  throw new Error("MSG91_AUTH_KEY must be set in production");
}

const stub = createStubNotifier(db);

const msg91Config: Msg91Config = {
  authKey: process.env.MSG91_AUTH_KEY ?? "",
  senderId: process.env.MSG91_SENDER_ID ?? "HGSPAT",
  templates: {
    parent_otp: process.env.MSG91_TEMPLATE_ID_PARENT_OTP ?? "",
    attendance_absent: process.env.MSG91_TEMPLATE_ID_ATTENDANCE_ALERT ?? "",
    attendance_late: process.env.MSG91_TEMPLATE_ID_ATTENDANCE_ALERT ?? "",
    announcement: process.env.MSG91_TEMPLATE_ID_ANNOUNCEMENT ?? "",
  },
};

const msg91 = createMsg91Notifier(db, msg91Config);

export function resolveImpl(templateKey: TemplateKey): "msg91" | "stub" {
  const flag =
    templateKey === "parent_otp" ? process.env.MSG91_ENABLED_FOR_OTP :
    templateKey === "announcement" ? process.env.MSG91_ENABLED_FOR_ANNOUNCEMENTS :
    process.env.MSG91_ENABLED_FOR_ATTENDANCE;
  return flag === "true" && msg91Config.authKey ? "msg91" : "stub";
}

export const notifier: Notifier = {
  sendParentOtp(phone, code, related) {
    return resolveImpl("parent_otp") === "msg91"
      ? msg91.sendParentOtp(phone, code, related)
      : stub.sendParentOtp(phone, code, related);
  },
  sendAttendanceAlert(phone, data, related) {
    return resolveImpl(data.status === "absent" ? "attendance_absent" : "attendance_late") === "msg91"
      ? msg91.sendAttendanceAlert(phone, data, related)
      : stub.sendAttendanceAlert(phone, data, related);
  },
  sendAnnouncement(phone, body, related) {
    return resolveImpl("announcement") === "msg91"
      ? msg91.sendAnnouncement(phone, body, related)
      : stub.sendAnnouncement(phone, body, related);
  },
};

export type { NotificationResult, AttendanceAlertData, RelatedEntity, TemplateKey } from "./types";
```

- [ ] **Step 4: Update .env.example**

Append to `.env.example`:

```
# MSG91 (Phase 1 — leave blank in dev to use stub notifier)
MSG91_AUTH_KEY=
MSG91_SENDER_ID=HGSPAT
MSG91_TEMPLATE_ID_PARENT_OTP=
MSG91_TEMPLATE_ID_ATTENDANCE_ALERT=
MSG91_TEMPLATE_ID_ANNOUNCEMENT=
MSG91_ENABLED_FOR_OTP=false
MSG91_ENABLED_FOR_ATTENDANCE=false
MSG91_ENABLED_FOR_ANNOUNCEMENTS=false
```

- [ ] **Step 5: Run tests**

```bash
pnpm vitest run tests/unit/notifier/routing.test.ts
```

Expected: 4 pass. (If the production-throw test misbehaves due to module cache, swap to `vi.resetModules()` + dynamic `await import()` pattern as needed.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifier/index.ts tests/unit/notifier/routing.test.ts .env.example
git -c commit.gpgsign=false commit -m "feat(notifier): env-routed singleton with prod safety check"
```

---

## Slice 4: Attendance marking

### Task 12: Server module for attendance

**Files:**
- Create: `src/server/attendance.ts`
- Create: `tests/unit/attendance.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/attendance.test.ts
import { describe, it, expect } from "vitest";
import { freshTestDb } from "../helpers/pglite";
import { user } from "@/lib/db/schema/auth";
import { academicYear, class_, section } from "@/lib/db/schema/academic";
import { student, parent, parentStudent, teacherAssignment } from "@/lib/db/schema/people";
import { attendance, notificationLog } from "@/lib/db/schema/communications";
import { markAttendance } from "@/lib/attendance-core";

// markAttendance has a pure-logic counterpart in lib/ for testability;
// the server action thin-wraps it with requireAbility + revalidatePath.

async function setupSchool(db: any) {
  const [yr] = await db.insert(academicYear).values({ name: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", isCurrent: true }).returning();
  const [cls] = await db.insert(class_).values({ name: "Grade 1", order: 1 }).returning();
  const [sec] = await db.insert(section).values({ classId: cls!.id, academicYearId: yr!.id, name: "A" }).returning();
  const [tch] = await db.insert(user).values({ id: "u-tch-1", email: "t@x", name: "T", role: "class_teacher" }).returning();
  await db.insert(teacherAssignment).values({ userId: tch!.id, sectionId: sec!.id, academicYearId: yr!.id, roleInSection: "class_teacher" });
  return { yr: yr!, cls: cls!, sec: sec!, tch: tch! };
}
async function addStudentWithParent(db: any, sectionId: string, admissionNo: string, phone?: string) {
  const [s] = await db.insert(student).values({ admissionNo, firstName: admissionNo, lastName: "T", currentSectionId: sectionId }).returning();
  if (phone) {
    const [p] = await db.insert(parent).values({ fullName: `P ${admissionNo}`, phone }).returning();
    await db.insert(parentStudent).values({ parentId: p!.id, studentId: s!.id, isPrimaryContact: true });
  }
  return s!;
}

describe("markAttendance (core logic)", () => {
  it("inserts rows for all entries; no notifications for present students", async () => {
    const { db } = await freshTestDb();
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001", "+919000000001");
    const s2 = await addStudentWithParent(db, sec.id, "T0002", "+919000000002");
    const result = await markAttendance(db, {
      sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [
        { studentId: s1.id, status: "present" },
        { studentId: s2.id, status: "present" },
      ],
    });
    expect(result.marked).toBe(2);
    expect(result.notified).toBe(0);
    expect(result.failed).toBe(0);
    const rows = await db.select().from(attendance);
    expect(rows.length).toBe(2);
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(0);
  });

  it("absent triggers one notification per absent student with primary parent", async () => {
    const { db } = await freshTestDb();
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001", "+919000000001");
    const s2 = await addStudentWithParent(db, sec.id, "T0002", "+919000000002");
    const result = await markAttendance(db, {
      sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [
        { studentId: s1.id, status: "absent" },
        { studentId: s2.id, status: "present" },
      ],
    });
    expect(result.notified).toBe(1);
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(1);
    expect(logs[0]?.recipientPhone).toBe("+919000000001");
    expect(logs[0]?.templateKey).toBe("attendance_absent");
  });

  it("re-marking same status does not re-notify", async () => {
    const { db } = await freshTestDb();
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001", "+919000000001");
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "absent" }] });
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "absent" }] });
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(1);
  });

  it("transition from absent to present does not send a 'now present' notification", async () => {
    const { db } = await freshTestDb();
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001", "+919000000001");
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "absent" }] });
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "present" }] });
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(1);  // only the original absent
  });

  it("transition from present to absent triggers one notification", async () => {
    const { db } = await freshTestDb();
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001", "+919000000001");
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "present" }] });
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "absent" }] });
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(1);
  });

  it("student with no primary parent is counted as skipped, no log row", async () => {
    const { db } = await freshTestDb();
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001"); // no phone
    const result = await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "absent" }] });
    expect(result.notified).toBe(0);
    expect(result.skipped).toBe(1);
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(0);
  });
});
```

Note: tests target a pure-logic module `@/lib/attendance-core` (no `requireAbility`, accepts the notifier/db as deps for test isolation). The server action wraps it.

- [ ] **Step 2: Run tests, verify fail**

```bash
pnpm vitest run tests/unit/attendance.test.ts
```

Expected: import errors.

- [ ] **Step 3: Implement core logic**

Create `src/lib/attendance-core.ts`:

```ts
import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "./db";
import { attendance } from "./db/schema/communications";
import { parent, parentStudent, student } from "./db/schema/people";
import { section, class_ } from "./db/schema/academic";
import { notifier as defaultNotifier } from "./notifier";
import type { Notifier } from "./notifier/types";

export interface MarkAttendanceInput {
  sectionId: string;
  date: string;        // ISO date, YYYY-MM-DD
  markerId: string;
  entries: { studentId: string; status: "present" | "absent" | "late"; notes?: string }[];
}

export interface MarkAttendanceResult {
  marked: number;
  notified: number;
  failed: number;
  skipped: number;
}

export async function markAttendance(
  db: DB,
  input: MarkAttendanceInput,
  notifier: Notifier = defaultNotifier,
): Promise<MarkAttendanceResult> {
  const studentIds = input.entries.map((e) => e.studentId);
  if (studentIds.length === 0) return { marked: 0, notified: 0, failed: 0, skipped: 0 };

  // Read prior status per (student, date) before write so we can compute transitions
  const prior = await db
    .select({ studentId: attendance.studentId, status: attendance.status })
    .from(attendance)
    .where(and(eq(attendance.date, input.date), inArray(attendance.studentId, studentIds)));
  const priorMap = new Map(prior.map((p) => [p.studentId, p.status]));

  // Single transaction for the writes
  await db.transaction(async (tx) => {
    for (const e of input.entries) {
      await tx
        .insert(attendance)
        .values({
          studentId: e.studentId,
          sectionId: input.sectionId,
          date: input.date,
          status: e.status,
          markedBy: input.markerId,
          notes: e.notes,
        })
        .onConflictDoUpdate({
          target: [attendance.studentId, attendance.date],
          set: { status: e.status, markedBy: input.markerId, markedAt: new Date(), notes: e.notes ?? null },
        });
    }
  });

  // Compute newly absent or late
  const toNotify = input.entries.filter((e) => {
    if (e.status !== "absent" && e.status !== "late") return false;
    const previous = priorMap.get(e.studentId);
    return previous !== e.status;     // first mark, or status changed
  });

  if (toNotify.length === 0) {
    return { marked: input.entries.length, notified: 0, failed: 0, skipped: 0 };
  }

  // Look up student/section name + primary parent phone for each
  const ids = toNotify.map((e) => e.studentId);
  const studentRows = await db
    .select({
      id: student.id, firstName: student.firstName, lastName: student.lastName,
      sectionName: section.name, className: class_.name,
    })
    .from(student)
    .leftJoin(section, eq(section.id, student.currentSectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .where(inArray(student.id, ids));
  const studentMap = new Map(studentRows.map((s) => [s.id, s]));

  const parentRows = await db
    .select({
      studentId: parentStudent.studentId,
      phone: parent.phone,
    })
    .from(parentStudent)
    .innerJoin(parent, eq(parent.id, parentStudent.parentId))
    .where(and(inArray(parentStudent.studentId, ids), eq(parentStudent.isPrimaryContact, true)));
  const parentPhoneMap = new Map(parentRows.map((p) => [p.studentId, p.phone]));

  let notified = 0, failed = 0, skipped = 0;
  for (const e of toNotify) {
    const phone = parentPhoneMap.get(e.studentId);
    if (!phone) { skipped++; continue; }
    const s = studentMap.get(e.studentId);
    const result = await notifier.sendAttendanceAlert(
      phone,
      {
        studentName: s ? `${s.firstName} ${s.lastName}`.trim() : "your child",
        date: formatDate(input.date),
        status: e.status as "absent" | "late",
        sectionName: s ? `${s.className ?? ""} · ${s.sectionName ?? ""}`.trim() : "",
      },
    );
    if (result.status === "sent" || result.status === "stub_sent") notified++;
    else failed++;
  }

  return { marked: input.entries.length, notified, failed, skipped };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d}-${months[Number(m) - 1]}-${y}`;
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run tests/unit/attendance.test.ts
```

Expected: all 6 pass.

- [ ] **Step 5: Create the thin server-action wrapper**

Create `src/server/attendance.ts`:

```ts
"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema/communications";
import { student, teacherAssignment } from "@/lib/db/schema/people";
import { section, class_, academicYear } from "@/lib/db/schema/academic";
import { markAttendance, type MarkAttendanceInput } from "@/lib/attendance-core";
import { requireAbility } from "./session";
import type { Role } from "@/lib/permissions";

const entrySchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(["present", "absent", "late"]),
  notes: z.string().optional(),
});

const inputSchema = z.object({
  sectionId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z.array(entrySchema).min(1),
});

export async function getAssignedSections() {
  const session = await requireAbility("attendance.mark");
  const role = (session.user as { role: Role }).role;
  if (role === "super_admin" || role === "principal") {
    return db
      .select({ id: section.id, name: section.name, className: class_.name })
      .from(section)
      .leftJoin(class_, eq(class_.id, section.classId))
      .innerJoin(academicYear, eq(academicYear.id, section.academicYearId))
      .where(eq(academicYear.isCurrent, true))
      .orderBy(asc(class_.order), asc(section.name));
  }
  return db
    .select({ id: section.id, name: section.name, className: class_.name })
    .from(teacherAssignment)
    .innerJoin(section, eq(section.id, teacherAssignment.sectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .innerJoin(academicYear, eq(academicYear.id, section.academicYearId))
    .where(and(eq(teacherAssignment.userId, session.user.id), eq(academicYear.isCurrent, true)))
    .orderBy(asc(class_.order), asc(section.name));
}

export async function getSectionAttendance(sectionId: string, date: string) {
  await requireAbility("attendance.mark");
  // Defense-in-depth: confirm caller can access this section
  const allowed = await getAssignedSections();
  if (!allowed.find((s) => s.id === sectionId)) throw new Error("Section not accessible");

  const students = await db
    .select({ id: student.id, admissionNo: student.admissionNo, firstName: student.firstName, lastName: student.lastName })
    .from(student)
    .where(eq(student.currentSectionId, sectionId))
    .orderBy(asc(student.admissionNo));
  const existing = await db
    .select({ studentId: attendance.studentId, status: attendance.status })
    .from(attendance)
    .where(and(eq(attendance.sectionId, sectionId), eq(attendance.date, date)));
  const statusMap = new Map(existing.map((e) => [e.studentId, e.status]));
  return students.map((s) => ({ ...s, status: statusMap.get(s.id) ?? null }));
}

export async function submitAttendance(formInput: unknown) {
  const session = await requireAbility("attendance.mark");
  const data = inputSchema.parse(formInput);
  // Defense-in-depth: confirm caller can mark this section
  const allowed = await getAssignedSections();
  if (!allowed.find((s) => s.id === data.sectionId)) throw new Error("Section not accessible");

  const result = await markAttendance(db, { ...data, markerId: session.user.id } satisfies MarkAttendanceInput);
  revalidatePath("/attendance");
  return result;
}
```

- [ ] **Step 6: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/attendance-core.ts src/server/attendance.ts tests/unit/attendance.test.ts
git -c commit.gpgsign=false commit -m "feat(attendance): mark + scoped fetch with stub-fanout"
```

### Task 13: Attendance grid component (UI)

**Files:**
- Create: `src/components/staff/attendance-grid.tsx`

- [ ] **Step 1: Build the client component**

```tsx
// src/components/staff/attendance-grid.tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitAttendance } from "@/server/attendance";

type StudentRow = { id: string; admissionNo: string; firstName: string; lastName: string; status: string | null };
type Status = "present" | "absent" | "late";

export function AttendanceGrid({ sectionId, date, students }: { sectionId: string; date: string; students: StudentRow[] }) {
  const [rows, setRows] = useState<Record<string, Status>>(
    Object.fromEntries(students.map((s) => [s.id, (s.status as Status) ?? "present"])),
  );
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function setStatus(id: string, status: Status) {
    setRows((r) => ({ ...r, [id]: status }));
  }

  function handleSubmit() {
    const entries = Object.entries(rows).map(([studentId, status]) => ({ studentId, status }));
    startTransition(async () => {
      try {
        const result = await submitAttendance({ sectionId, date, entries });
        const parts = [`Marked ${result.marked}`];
        if (result.notified > 0) parts.push(`notified ${result.notified}`);
        if (result.failed > 0) parts.push(`${result.failed} failed`);
        if (result.skipped > 0) parts.push(`${result.skipped} skipped (no parent phone)`);
        setToast(parts.join(", "));
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-sm border-b border-rule">
            <th className="py-2 pr-4">Adm. No.</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b border-rule/50">
              <td className="py-2 pr-4 text-sm">{s.admissionNo}</td>
              <td className="py-2 pr-4 text-sm">{s.firstName} {s.lastName}</td>
              <td className="py-2">
                {(["present", "absent", "late"] as Status[]).map((opt) => (
                  <label key={opt} className="inline-flex items-center mr-4 text-sm">
                    <input
                      type="radio"
                      name={`s-${s.id}`}
                      checked={rows[s.id] === opt}
                      onChange={() => setStatus(s.id, opt)}
                      className="mr-1"
                    />
                    {opt}
                  </label>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-4">
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Saving…" : "Save attendance"}
        </Button>
        {toast && <span className="text-sm text-mute">{toast}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit (no test — UI shell)**

```bash
git add src/components/staff/attendance-grid.tsx
git -c commit.gpgsign=false commit -m "feat(ui): attendance grid component"
```

### Task 14: Staff attendance page

**Files:**
- Create: `src/app/(staff)/attendance/page.tsx`

- [ ] **Step 1: Build the RSC page**

```tsx
// src/app/(staff)/attendance/page.tsx
import Link from "next/link";
import { getAssignedSections, getSectionAttendance } from "@/server/attendance";
import { AttendanceGrid } from "@/components/staff/attendance-grid";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; date?: string }>;
}) {
  const params = await searchParams;
  const sections = await getAssignedSections();
  const today = new Date().toISOString().slice(0, 10);
  const sectionId = params.section ?? sections[0]?.id;
  const date = params.date ?? today;

  if (!sections.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-serif mb-4">Attendance</h1>
        <p className="text-mute">No sections assigned to you for the current academic year.</p>
      </div>
    );
  }

  const students = sectionId ? await getSectionAttendance(sectionId, date) : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-serif">Attendance</h1>
      <form className="flex gap-4 items-end">
        <label className="flex flex-col text-sm">
          Section
          <select name="section" defaultValue={sectionId} className="border border-rule rounded px-2 py-1">
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.className} · {s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Date
          <input type="date" name="date" defaultValue={date} className="border border-rule rounded px-2 py-1" />
        </label>
        <button type="submit" className="border border-rule rounded px-3 py-1 text-sm">Load</button>
        <Link href="/attendance/all" className="ml-auto text-sm underline">Cross-section view</Link>
      </form>
      {sectionId && (
        <AttendanceGrid sectionId={sectionId} date={date} students={students} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Smoke test in browser**

```bash
pnpm dev
```

In another terminal: open `http://localhost:3000/login`, sign in as a class teacher (you can create one via `/users` or via seed). Navigate to `/attendance`. Pick a section, mark some students, click Save. You should see a toast like `Marked X, notified Y, skipped Z`. Stop dev server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add src/app/(staff)/attendance/page.tsx
git -c commit.gpgsign=false commit -m "feat(ui): staff attendance page"
```

### Task 15: Cross-section attendance page (admin)

**Files:**
- Create: `src/app/(staff)/attendance/all/page.tsx`
- Create: `src/server/attendance.ts` (extend with `listAttendanceByDate`)

- [ ] **Step 1: Add the query**

Modify `src/server/attendance.ts` — append:

```ts
export async function listAttendanceByDate(date: string) {
  await requireAbility("attendance.view-all");
  return db
    .select({
      studentId: student.id, admissionNo: student.admissionNo,
      firstName: student.firstName, lastName: student.lastName,
      sectionName: section.name, className: class_.name,
      status: attendance.status,
    })
    .from(attendance)
    .innerJoin(student, eq(student.id, attendance.studentId))
    .innerJoin(section, eq(section.id, attendance.sectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .where(eq(attendance.date, date))
    .orderBy(asc(class_.order), asc(section.name), asc(student.admissionNo));
}
```

- [ ] **Step 2: Build the page**

```tsx
// src/app/(staff)/attendance/all/page.tsx
import { listAttendanceByDate } from "@/server/attendance";

export default async function AllAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date ?? new Date().toISOString().slice(0, 10);
  const rows = await listAttendanceByDate(date);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-serif">All attendance — {date}</h1>
      <form>
        <label className="text-sm">
          Date
          <input type="date" name="date" defaultValue={date} className="border border-rule rounded px-2 py-1 ml-2" />
        </label>
      </form>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-rule">
            <th className="py-2">Adm.</th><th>Name</th><th>Class · Section</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.studentId} className="border-b border-rule/50">
              <td className="py-2">{r.admissionNo}</td>
              <td>{r.firstName} {r.lastName}</td>
              <td>{r.className} · {r.sectionName}</td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(staff)/attendance/all/page.tsx src/server/attendance.ts
git -c commit.gpgsign=false commit -m "feat(ui): cross-section attendance view for admins"
```

### Task 16: Sidebar nav entry for attendance

**Files:**
- Modify: `src/components/staff/nav-sidebar.tsx`

- [ ] **Step 1: Add nav links**

Modify `ALL_LINKS` in `src/components/staff/nav-sidebar.tsx`:

```ts
const ALL_LINKS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/attendance", label: "Attendance", ability: "attendance.mark" },
  { href: "/announcements", label: "Announcements", ability: "announcements.send" },
  { href: "/notifications", label: "Notifications log", ability: "notifications.view-all" },
  { href: "/academic-years", label: "Academic years", ability: "academic-years.manage" },
  { href: "/classes", label: "Classes & sections", ability: "classes.manage" },
  { href: "/subjects", label: "Subjects", ability: "subjects.manage" },
  { href: "/students", label: "Students", ability: "students.view" },
  { href: "/users", label: "Staff users", ability: "users.manage" },
];
```

(The filter logic on line 21 already handles ability gating per the established pattern.)

- [ ] **Step 2: Commit**

```bash
git add src/components/staff/nav-sidebar.tsx
git -c commit.gpgsign=false commit -m "feat(ui): add Attendance, Announcements, Notifications to staff sidebar"
```

---

## Slice 5: Announcement send

### Task 17: Server module for announcements

**Files:**
- Create: `src/server/announcements.ts`
- Create: `src/lib/announcement-core.ts`
- Create: `tests/unit/announcements.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/announcements.test.ts
import { describe, it, expect } from "vitest";
import { freshTestDb } from "../helpers/pglite";
import { user } from "@/lib/db/schema/auth";
import { academicYear, class_, section } from "@/lib/db/schema/academic";
import { student, parent, parentStudent } from "@/lib/db/schema/people";
import { announcement, notificationLog } from "@/lib/db/schema/communications";
import { sendAnnouncement } from "@/lib/announcement-core";

async function setup(db: any) {
  const [yr] = await db.insert(academicYear).values({ name: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", isCurrent: true }).returning();
  const [c1] = await db.insert(class_).values({ name: "Grade 1", order: 1 }).returning();
  const [c2] = await db.insert(class_).values({ name: "Grade 2", order: 2 }).returning();
  const [s1] = await db.insert(section).values({ classId: c1!.id, academicYearId: yr!.id, name: "A" }).returning();
  const [s2] = await db.insert(section).values({ classId: c2!.id, academicYearId: yr!.id, name: "A" }).returning();
  const [sender] = await db.insert(user).values({ id: "u-admin", email: "a@x", name: "A", role: "super_admin" }).returning();
  return { yr: yr!, c1: c1!, c2: c2!, s1: s1!, s2: s2!, sender: sender! };
}

async function addStudentWithParent(db: any, sectionId: string, admNo: string, parentPhone: string) {
  const [s] = await db.insert(student).values({ admissionNo: admNo, firstName: admNo, lastName: "T", currentSectionId: sectionId }).returning();
  let parentRow = (await db.select().from(parent).where((p: any) => p.phone === parentPhone))[0];
  if (!parentRow) {
    [parentRow] = await db.insert(parent).values({ fullName: `P ${admNo}`, phone: parentPhone }).returning();
  }
  await db.insert(parentStudent).values({ parentId: parentRow!.id, studentId: s!.id, isPrimaryContact: true });
  return s!;
}

describe("sendAnnouncement", () => {
  it("school audience: fans out to every parent (deduped by phone)", async () => {
    const { db } = await freshTestDb();
    const ctx = await setup(db);
    await addStudentWithParent(db, ctx.s1.id, "T0001", "+919000000001");
    await addStudentWithParent(db, ctx.s2.id, "T0002", "+919000000002");
    // sibling case: parent +919000000003 has 2 kids
    await addStudentWithParent(db, ctx.s1.id, "T0003", "+919000000003");
    await addStudentWithParent(db, ctx.s2.id, "T0004", "+919000000003");
    const result = await sendAnnouncement(db, {
      sentBy: ctx.sender.id,
      audienceType: "school",
      audienceRef: null,
      body: "Holiday tomorrow.",
    });
    expect(result.recipientCount).toBe(3);    // deduped
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(3);
    const ann = await db.select().from(announcement);
    expect(ann.length).toBe(1);
    expect(ann[0]?.recipientCount).toBe(3);
  });

  it("class audience: parents of students in any section of the class", async () => {
    const { db } = await freshTestDb();
    const ctx = await setup(db);
    await addStudentWithParent(db, ctx.s1.id, "T0001", "+919000000001"); // class 1
    await addStudentWithParent(db, ctx.s2.id, "T0002", "+919000000002"); // class 2
    const result = await sendAnnouncement(db, {
      sentBy: ctx.sender.id,
      audienceType: "class",
      audienceRef: { classId: ctx.c1.id },
      body: "Grade 1 only.",
    });
    expect(result.recipientCount).toBe(1);
  });

  it("section audience: only parents of that section", async () => {
    const { db } = await freshTestDb();
    const ctx = await setup(db);
    await addStudentWithParent(db, ctx.s1.id, "T0001", "+919000000001");
    await addStudentWithParent(db, ctx.s2.id, "T0002", "+919000000002");
    const result = await sendAnnouncement(db, {
      sentBy: ctx.sender.id,
      audienceType: "section",
      audienceRef: { sectionId: ctx.s2.id },
      body: "Section 2A only.",
    });
    expect(result.recipientCount).toBe(1);
    const logs = await db.select().from(notificationLog);
    expect(logs[0]?.recipientPhone).toBe("+919000000002");
  });

  it("students audience: only parents of those specific students", async () => {
    const { db } = await freshTestDb();
    const ctx = await setup(db);
    const s1 = await addStudentWithParent(db, ctx.s1.id, "T0001", "+919000000001");
    await addStudentWithParent(db, ctx.s1.id, "T0002", "+919000000002");
    const result = await sendAnnouncement(db, {
      sentBy: ctx.sender.id,
      audienceType: "students",
      audienceRef: { studentIds: [s1.id] },
      body: "One student only.",
    });
    expect(result.recipientCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

```bash
pnpm vitest run tests/unit/announcements.test.ts
```

Expected: import errors.

- [ ] **Step 3: Implement core logic**

```ts
// src/lib/announcement-core.ts
import { eq, inArray } from "drizzle-orm";
import type { DB } from "./db";
import { announcement } from "./db/schema/communications";
import { parent, parentStudent, student } from "./db/schema/people";
import { section } from "./db/schema/academic";
import { notifier as defaultNotifier } from "./notifier";
import type { Notifier } from "./notifier/types";

export type AudienceType = "school" | "class" | "section" | "students";
export type AudienceRef =
  | null
  | { classId: string }
  | { sectionId: string }
  | { studentIds: string[] };

export interface SendAnnouncementInput {
  sentBy: string;
  audienceType: AudienceType;
  audienceRef: AudienceRef;
  body: string;
}

export interface SendAnnouncementResult {
  announcementId: string;
  recipientCount: number;
  notified: number;
  failed: number;
}

export async function sendAnnouncement(
  db: DB,
  input: SendAnnouncementInput,
  notifier: Notifier = defaultNotifier,
): Promise<SendAnnouncementResult> {
  const phones = await resolveAudiencePhones(db, input.audienceType, input.audienceRef);
  const unique = Array.from(new Set(phones));

  const [created] = await db.insert(announcement).values({
    sentBy: input.sentBy,
    audienceType: input.audienceType,
    audienceRef: input.audienceRef as object | null,
    body: input.body,
    recipientCount: unique.length,
  }).returning();
  if (!created) throw new Error("announcement insert failed");

  let notified = 0, failed = 0;
  for (const phone of unique) {
    const result = await notifier.sendAnnouncement(phone, input.body, { type: "announcement", id: created.id });
    if (result.status === "sent" || result.status === "stub_sent") notified++;
    else failed++;
  }

  return { announcementId: created.id, recipientCount: unique.length, notified, failed };
}

async function resolveAudiencePhones(db: DB, type: AudienceType, ref: AudienceRef): Promise<string[]> {
  if (type === "school") {
    const rows = await db.select({ phone: parent.phone }).from(parent);
    return rows.map((r) => r.phone);
  }
  if (type === "class") {
    if (!ref || !("classId" in ref)) throw new Error("class audience requires classId");
    const rows = await db
      .select({ phone: parent.phone })
      .from(parentStudent)
      .innerJoin(parent, eq(parent.id, parentStudent.parentId))
      .innerJoin(student, eq(student.id, parentStudent.studentId))
      .innerJoin(section, eq(section.id, student.currentSectionId))
      .where(eq(section.classId, ref.classId));
    return rows.map((r) => r.phone);
  }
  if (type === "section") {
    if (!ref || !("sectionId" in ref)) throw new Error("section audience requires sectionId");
    const rows = await db
      .select({ phone: parent.phone })
      .from(parentStudent)
      .innerJoin(parent, eq(parent.id, parentStudent.parentId))
      .innerJoin(student, eq(student.id, parentStudent.studentId))
      .where(eq(student.currentSectionId, ref.sectionId));
    return rows.map((r) => r.phone);
  }
  if (type === "students") {
    if (!ref || !("studentIds" in ref) || ref.studentIds.length === 0) return [];
    const rows = await db
      .select({ phone: parent.phone })
      .from(parentStudent)
      .innerJoin(parent, eq(parent.id, parentStudent.parentId))
      .where(inArray(parentStudent.studentId, ref.studentIds));
    return rows.map((r) => r.phone);
  }
  return [];
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
pnpm vitest run tests/unit/announcements.test.ts
```

Expected: 4 pass.

- [ ] **Step 5: Wrap as server action**

```ts
// src/server/announcements.ts
"use server";

import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { announcement } from "@/lib/db/schema/communications";
import { sendAnnouncement, type SendAnnouncementInput } from "@/lib/announcement-core";
import { requireAbility } from "./session";

const inputSchema = z.discriminatedUnion("audienceType", [
  z.object({ audienceType: z.literal("school"), body: z.string().min(1) }),
  z.object({ audienceType: z.literal("class"), classId: z.string().uuid(), body: z.string().min(1) }),
  z.object({ audienceType: z.literal("section"), sectionId: z.string().uuid(), body: z.string().min(1) }),
  z.object({ audienceType: z.literal("students"), studentIds: z.array(z.string().uuid()).min(1), body: z.string().min(1) }),
]);

export async function submitAnnouncement(formInput: unknown) {
  const session = await requireAbility("announcements.send");
  const data = inputSchema.parse(formInput);
  if (data.audienceType === "school") await requireAbility("announcements.send-school-wide");

  const ref =
    data.audienceType === "school" ? null :
    data.audienceType === "class" ? { classId: data.classId } :
    data.audienceType === "section" ? { sectionId: data.sectionId } :
    { studentIds: data.studentIds };

  const result = await sendAnnouncement(db, {
    sentBy: session.user.id,
    audienceType: data.audienceType,
    audienceRef: ref,
    body: data.body,
  } satisfies SendAnnouncementInput);
  revalidatePath("/announcements");
  return result;
}

export async function listAnnouncements() {
  await requireAbility("announcements.view");
  return db.select().from(announcement).orderBy(desc(announcement.sentAt)).limit(50);
}
```

- [ ] **Step 6: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/announcement-core.ts src/server/announcements.ts tests/unit/announcements.test.ts
git -c commit.gpgsign=false commit -m "feat(announcements): send + audience resolution + dedup"
```

### Task 18: Announcement composer UI + new page

**Files:**
- Create: `src/components/staff/audience-picker.tsx`
- Create: `src/components/staff/announcement-composer.tsx`
- Create: `src/app/(staff)/announcements/new/page.tsx`
- Create: `src/app/(staff)/announcements/page.tsx`

- [ ] **Step 1: Audience picker component**

```tsx
// src/components/staff/audience-picker.tsx
"use client";

type Klass = { id: string; name: string };
type Section = { id: string; name: string; className: string | null };

export type AudienceState =
  | { type: "school" }
  | { type: "class"; classId: string }
  | { type: "section"; sectionId: string };

export function AudiencePicker({
  classes, sections, value, onChange, allowSchoolWide,
}: {
  classes: Klass[]; sections: Section[];
  value: AudienceState; onChange: (s: AudienceState) => void;
  allowSchoolWide: boolean;
}) {
  return (
    <div className="space-y-3">
      {allowSchoolWide && (
        <label className="block text-sm">
          <input type="radio" checked={value.type === "school"} onChange={() => onChange({ type: "school" })} className="mr-2" />
          Whole school
        </label>
      )}
      <label className="block text-sm">
        <input type="radio" checked={value.type === "class"} onChange={() => onChange({ type: "class", classId: classes[0]?.id ?? "" })} className="mr-2" />
        A class
        {value.type === "class" && (
          <select className="ml-2 border border-rule rounded px-2 py-1" value={value.classId}
            onChange={(e) => onChange({ type: "class", classId: e.target.value })}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </label>
      <label className="block text-sm">
        <input type="radio" checked={value.type === "section"} onChange={() => onChange({ type: "section", sectionId: sections[0]?.id ?? "" })} className="mr-2" />
        A section
        {value.type === "section" && (
          <select className="ml-2 border border-rule rounded px-2 py-1" value={value.sectionId}
            onChange={(e) => onChange({ type: "section", sectionId: e.target.value })}>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.className} · {s.name}</option>)}
          </select>
        )}
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Composer component**

```tsx
// src/components/staff/announcement-composer.tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitAnnouncement } from "@/server/announcements";
import { AudiencePicker, type AudienceState } from "./audience-picker";

type Klass = { id: string; name: string };
type Section = { id: string; name: string; className: string | null };

export function AnnouncementComposer({ classes, sections, allowSchoolWide }: {
  classes: Klass[]; sections: Section[]; allowSchoolWide: boolean;
}) {
  const [audience, setAudience] = useState<AudienceState>({ type: "section", sectionId: sections[0]?.id ?? "" });
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function handleSend() {
    const payload =
      audience.type === "school" ? { audienceType: "school", body } :
      audience.type === "class" ? { audienceType: "class", classId: audience.classId, body } :
      { audienceType: "section", sectionId: audience.sectionId, body };
    startTransition(async () => {
      try {
        const result = await submitAnnouncement(payload);
        setToast(`Sent to ${result.recipientCount}, notified ${result.notified}, ${result.failed} failed`);
        setBody("");
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Send failed");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium mb-2">Audience</label>
        <AudiencePicker classes={classes} sections={sections} value={audience} onChange={setAudience} allowSchoolWide={allowSchoolWide} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Message</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="w-full border border-rule rounded px-3 py-2" />
        <p className="text-xs text-mute mt-1">Keep it short — SMS is 160 chars per segment.</p>
      </div>
      <div className="flex items-center gap-4">
        <Button onClick={handleSend} disabled={pending || !body.trim()}>
          {pending ? "Sending…" : "Send"}
        </Button>
        {toast && <span className="text-sm text-mute">{toast}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: New-announcement page (RSC)**

```tsx
// src/app/(staff)/announcements/new/page.tsx
import { db } from "@/lib/db";
import { class_, section } from "@/lib/db/schema/academic";
import { asc, eq } from "drizzle-orm";
import { requireAbility } from "@/server/session";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { AnnouncementComposer } from "@/components/staff/announcement-composer";

export default async function NewAnnouncementPage() {
  const session = await requireAbility("announcements.send");
  const role = (session.user as { role: Role }).role;
  const classes = await db.select({ id: class_.id, name: class_.name }).from(class_).orderBy(asc(class_.order));
  const sections = await db
    .select({ id: section.id, name: section.name, className: class_.name })
    .from(section)
    .leftJoin(class_, eq(class_.id, section.classId))
    .orderBy(asc(class_.order), asc(section.name));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-serif">New announcement</h1>
      <AnnouncementComposer classes={classes} sections={sections} allowSchoolWide={can(role, "announcements.send-school-wide")} />
    </div>
  );
}
```

- [ ] **Step 4: Announcements list page**

```tsx
// src/app/(staff)/announcements/page.tsx
import Link from "next/link";
import { listAnnouncements } from "@/server/announcements";

export default async function AnnouncementsPage() {
  const items = await listAnnouncements();
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif">Announcements</h1>
        <Link href="/announcements/new" className="border border-rule rounded px-3 py-1 text-sm">New</Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-rule"><th className="py-2">Sent at</th><th>Audience</th><th>Recipients</th><th>Body</th></tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="border-b border-rule/50">
              <td className="py-2">{new Date(a.sentAt).toLocaleString()}</td>
              <td>{a.audienceType}</td>
              <td>{a.recipientCount}</td>
              <td className="max-w-md truncate">{a.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Smoke test in browser**

```bash
pnpm dev
```

Sign in as super_admin. Visit `/announcements/new`. Pick "Whole school", type a message, click Send. Toast should show count. Visit `/announcements` to see it listed. Visit `/notifications` (next slice) to see fan-out logs (or check via `pnpm drizzle-kit studio` for now).

- [ ] **Step 6: Commit**

```bash
git add src/components/staff/audience-picker.tsx src/components/staff/announcement-composer.tsx src/app/(staff)/announcements/
git -c commit.gpgsign=false commit -m "feat(ui): announcement composer + list page"
```

### Task 19: Notifications log page (admin)

**Files:**
- Create: `src/server/notifications.ts`
- Create: `src/app/(staff)/notifications/page.tsx`

- [ ] **Step 1: Server module**

```ts
// src/server/notifications.ts
"use server";

import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationLog } from "@/lib/db/schema/communications";
import { requireAbility } from "./session";

export async function listAllNotifications(limit = 200) {
  await requireAbility("notifications.view-all");
  return db.select().from(notificationLog).orderBy(desc(notificationLog.createdAt)).limit(limit);
}
```

- [ ] **Step 2: Page**

```tsx
// src/app/(staff)/notifications/page.tsx
import { listAllNotifications } from "@/server/notifications";

export default async function NotificationsPage() {
  const rows = await listAllNotifications();
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-serif">Notifications log</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-rule">
            <th className="py-2">Time</th><th>Channel</th><th>Template</th><th>Phone</th><th>Status</th><th>Provider</th><th>Error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-rule/50">
              <td className="py-2">{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.channel}</td>
              <td>{r.templateKey}</td>
              <td>{r.recipientPhone}</td>
              <td>{r.status}</td>
              <td>{r.provider}</td>
              <td className="text-red-600 text-xs">{r.errorMessage ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/server/notifications.ts src/app/(staff)/notifications/page.tsx
git -c commit.gpgsign=false commit -m "feat(ui): admin notifications log page"
```

---

## Slice 6: MSG91 + parent OTP wiring

### Task 20: OTP rate limit module + tests

**Files:**
- Create: `src/lib/otp-rate-limit.ts`
- Create: `tests/unit/otp-rate-limit.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/otp-rate-limit.test.ts
import { describe, it, expect } from "vitest";
import { freshTestDb } from "../helpers/pglite";
import { checkAndRecordOtp } from "@/lib/otp-rate-limit";
import { otpAttempt } from "@/lib/db/schema/communications";

describe("OTP rate limit", () => {
  it("first 3 attempts in same hour are allowed; 4th is rate_limited", async () => {
    const { db } = await freshTestDb();
    expect(await checkAndRecordOtp(db, "+919000000001")).toBe("ok");
    expect(await checkAndRecordOtp(db, "+919000000001")).toBe("ok");
    expect(await checkAndRecordOtp(db, "+919000000001")).toBe("ok");
    expect(await checkAndRecordOtp(db, "+919000000001")).toBe("rate_limited");
    const rows = await db.select().from(otpAttempt);
    expect(rows.length).toBe(3);    // rate-limited attempt is NOT recorded
  });

  it("different phones don't interfere", async () => {
    const { db } = await freshTestDb();
    for (let i = 0; i < 3; i++) await checkAndRecordOtp(db, "+919000000001");
    expect(await checkAndRecordOtp(db, "+919000000002")).toBe("ok");
  });

  it("daily limit of 10 is enforced beyond hourly", async () => {
    const { db } = await freshTestDb();
    // Insert 10 attempts manually within the past 24h (older than 1h to avoid hourly limit interference)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    for (let i = 0; i < 10; i++) {
      await db.insert(otpAttempt).values({ phone: "+919000000099", attemptedAt: twoHoursAgo });
    }
    expect(await checkAndRecordOtp(db, "+919000000099")).toBe("rate_limited");
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

```bash
pnpm vitest run tests/unit/otp-rate-limit.test.ts
```

Expected: import errors.

- [ ] **Step 3: Implement**

```ts
// src/lib/otp-rate-limit.ts
import { and, eq, gte, sql } from "drizzle-orm";
import type { DB } from "./db";
import { otpAttempt } from "./db/schema/communications";

const MAX_PER_HOUR = 3;
const MAX_PER_DAY = 10;

export type OtpCheckResult = "ok" | "rate_limited";

export async function checkAndRecordOtp(db: DB, phone: string): Promise<OtpCheckResult> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const counts = await db
    .select({
      hour: sql<number>`count(*) filter (where ${otpAttempt.attemptedAt} >= ${oneHourAgo})`,
      day: sql<number>`count(*) filter (where ${otpAttempt.attemptedAt} >= ${oneDayAgo})`,
    })
    .from(otpAttempt)
    .where(eq(otpAttempt.phone, phone));

  const hourCount = Number(counts[0]?.hour ?? 0);
  const dayCount = Number(counts[0]?.day ?? 0);

  if (hourCount >= MAX_PER_HOUR || dayCount >= MAX_PER_DAY) return "rate_limited";

  await db.insert(otpAttempt).values({ phone });
  return "ok";
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run tests/unit/otp-rate-limit.test.ts
```

Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/otp-rate-limit.ts tests/unit/otp-rate-limit.test.ts
git -c commit.gpgsign=false commit -m "feat(otp): sliding-window rate limit"
```

### Task 21: Wire Better Auth phoneNumber plugin

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/auth-client.ts`

- [ ] **Step 1: Enable phoneNumber plugin server-side**

Modify `src/lib/auth.ts` — add the plugin import and config:

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema/auth";
import { notifier } from "./notifier";

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret && !isBuildPhase) {
  throw new Error("BETTER_AUTH_SECRET not set");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  secret: secret ?? "build-placeholder-not-used-at-runtime",
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      phoneNumber: { type: "string", required: false },
      phoneNumberVerified: { type: "boolean", required: false, defaultValue: false },
      role: { type: "string", required: true },
      isActive: { type: "boolean", required: false, defaultValue: true },
    },
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }) => {
        await notifier.sendParentOtp(phone, code, { type: "parent_otp", id: "00000000-0000-0000-0000-000000000000" });
      },
      otpLength: 6,
      expiresIn: 600,           // 10 minutes
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/\D/g, "")}@parent.local`,
        getTempName: () => "Parent",
      },
      callbackOnVerification: async ({ user: u }) => {
        // Stamp role=parent on the freshly-created user (the plugin's signUp doesn't set role)
        const { db } = await import("./db");
        const { eq } = await import("drizzle-orm");
        const { user } = await import("./db/schema/auth");
        await db.update(user).set({ role: "parent", phoneNumberVerified: true }).where(eq(user.id, u.id));
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
```

(If your Better Auth version's phoneNumber plugin uses different option names, adapt: this plan is current as of `better-auth ^1.6`. Confirm with `pnpm tsc --noEmit` after.)

- [ ] **Step 2: Update client**

Modify `src/lib/auth-client.ts` — add phoneNumber client plugin:

```ts
import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [phoneNumberClient()],
});

export const { signIn, signOut, signUp, useSession, phoneNumber } = authClient;
```

- [ ] **Step 3: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: zero errors. If errors mention `phoneNumber` plugin shape, consult `better-auth` docs for the installed version and adjust.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/lib/auth-client.ts
git -c commit.gpgsign=false commit -m "feat(auth): enable Better Auth phoneNumber plugin with notifier sendOTP"
```

### Task 22: Server module for parent

**Files:**
- Create: `src/server/parent.ts`

- [ ] **Step 1: Write the module**

```ts
// src/server/parent.ts
"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { parent, parentStudent, student } from "@/lib/db/schema/people";
import { class_, section } from "@/lib/db/schema/academic";
import { user } from "@/lib/db/schema/auth";
import { checkAndRecordOtp } from "@/lib/otp-rate-limit";
import { auth } from "@/lib/auth";
import { requireParent } from "./session";
import { notifier } from "@/lib/notifier";
import { notificationLog } from "@/lib/db/schema/communications";

export async function requestParentOtp(phone: string): Promise<{ ok: true }> {
  // Always return generic success — never leak which numbers are registered
  if (!/^\+91\d{10}$/.test(phone)) return { ok: true };
  const limit = await checkAndRecordOtp(db, phone);
  if (limit === "rate_limited") {
    await db.insert(notificationLog).values({
      channel: "sms", templateKey: "parent_otp", recipientPhone: phone,
      status: "rate_limited", provider: "stub",
    });
    return { ok: true };
  }
  await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: phone } });
  return { ok: true };
}

export async function getLinkedStudents() {
  const session = await requireParent();
  const phone = (session.user as { phoneNumber?: string }).phoneNumber;
  if (!phone) return [];
  const parents = await db.select({ id: parent.id }).from(parent).where(eq(parent.phone, phone));
  if (parents.length === 0) return [];
  const links = await db
    .select({
      studentId: parentStudent.studentId,
      admissionNo: student.admissionNo,
      firstName: student.firstName, lastName: student.lastName,
      sectionName: section.name, className: class_.name,
    })
    .from(parentStudent)
    .innerJoin(student, eq(student.id, parentStudent.studentId))
    .leftJoin(section, eq(section.id, student.currentSectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .where(inArray(parentStudent.parentId, parents.map((p) => p.id)));
  return links;
}
```

(If `auth.api.sendPhoneNumberOTP` has a different name in your installed Better Auth version, look it up via `pnpm tsx -e "console.log(Object.keys((await import('@/lib/auth')).auth.api))"` and use the right one — the OTP-sending API.)

- [ ] **Step 2: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/parent.ts
git -c commit.gpgsign=false commit -m "feat(parent): server module for OTP request + linked students"
```

### Task 23: Parent login pages

**Files:**
- Create: `src/app/(auth)/parent-login/page.tsx`
- Create: `src/app/(auth)/parent-login/verify/page.tsx`
- Modify: `src/middleware.ts`

- [ ] **Step 1: Phone entry page**

```tsx
// src/app/(auth)/parent-login/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestParentOtp } from "@/server/parent";

export default function ParentLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) { setMsg("Enter your 10-digit mobile number."); return; }
    const full = "+91" + cleaned;
    startTransition(async () => {
      await requestParentOtp(full);
      router.push(`/parent-login/verify?phone=${encodeURIComponent(full)}`);
    });
  }

  return (
    <div className="max-w-sm mx-auto py-12 space-y-6">
      <h1 className="text-2xl font-serif">Parent login</h1>
      <p className="text-sm text-mute">Enter the mobile number registered with the school. We'll send you a one-time code.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex">
          <span className="border border-rule rounded-l px-3 py-2 bg-cream text-sm">+91</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric"
            className="flex-1 border-y border-r border-rule rounded-r px-3 py-2" placeholder="10-digit number" />
        </div>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Sending…" : "Send code"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: OTP verify page**

```tsx
// src/app/(auth)/parent-login/verify/page.tsx
"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { phoneNumber } from "@/lib/auth-client";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await phoneNumber.verify({ phoneNumber: phone, code });
      if (result.error) {
        setMsg("Invalid or expired code. Try again.");
        return;
      }
      router.push("/dashboard"); // parent layout will resolve to parent dashboard
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-mute">Enter the 6-digit code sent to {phone}.</p>
      <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6}
        className="w-full border border-rule rounded px-3 py-2 text-center tracking-widest font-mono" />
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <Button type="submit" disabled={pending || code.length !== 6} className="w-full">
        {pending ? "Verifying…" : "Verify"}
      </Button>
    </form>
  );
}

export default function VerifyPage() {
  return (
    <div className="max-w-sm mx-auto py-12 space-y-6">
      <h1 className="text-2xl font-serif">Enter code</h1>
      <Suspense fallback={null}><VerifyForm /></Suspense>
    </div>
  );
}
```

- [ ] **Step 3: Update middleware to allow parent-login publicly + gate /(parent) routes**

Read the existing `src/middleware.ts`. The current Phase 0 middleware likely matches staff routes only. Extend it to:
- Allow `/parent-login` and `/parent-login/verify` without session
- Gate `/(parent)` route group with the same coarse cookie check

Modify `src/middleware.ts` (assumes existing `getSessionCookie` helper):

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const STAFF_PREFIXES = ["/dashboard", "/students", "/classes", "/subjects", "/academic-years", "/users", "/attendance", "/announcements", "/notifications"];
const PARENT_PREFIXES = ["/parent"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isStaff = STAFF_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isParent = PARENT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isStaff && !isParent) return NextResponse.next();
  const sessionCookie = getSessionCookie(req);
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = isParent ? "/parent-login" : "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|parent-login|.*\\.).*)"],
};
```

- [ ] **Step 4: Smoke test**

```bash
pnpm dev
```

Visit `/parent-login`, enter your own phone (one that has a parent row in the DB — use seed or insert one). Click Send code. The notifier is currently the stub (Phase 1 default), so the code will land in the `notification_log` table, not on your phone. Open `pnpm drizzle-kit studio` to read the generated code, enter it on the verify page. You should land on `/dashboard` and see the parent layout (which doesn't exist yet — error is expected; we build it in the next slice).

- [ ] **Step 5: Commit**

```bash
git add src/app/(auth)/parent-login src/middleware.ts
git -c commit.gpgsign=false commit -m "feat(auth): parent login pages + middleware gating"
```

---

## Slice 7: Parent portal pages

### Task 24: Parent route group layout + child switcher

**Files:**
- Create: `src/app/(parent)/layout.tsx`
- Create: `src/components/parent/child-switcher.tsx`

- [ ] **Step 1: Child switcher component**

```tsx
// src/components/parent/child-switcher.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Child = { studentId: string; firstName: string; lastName: string; admissionNo: string };

export function ChildSwitcher({ children, current }: { children: Child[]; current: string | null }) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newParams = new URLSearchParams(params.toString());
    newParams.set("child", e.target.value);
    router.push(`?${newParams.toString()}`);
  }

  if (children.length === 0) return null;
  if (children.length === 1) {
    const c = children[0]!;
    return <span className="text-sm text-mute">{c.firstName} {c.lastName} · {c.admissionNo}</span>;
  }
  return (
    <select onChange={onChange} value={current ?? children[0]!.studentId} className="border border-rule rounded px-2 py-1 text-sm">
      {children.map((c) => (
        <option key={c.studentId} value={c.studentId}>{c.firstName} {c.lastName} · {c.admissionNo}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Parent layout (RSC)**

```tsx
// src/app/(parent)/layout.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getLinkedStudents } from "@/server/parent";
import { ChildSwitcher } from "@/components/parent/child-switcher";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/parent-login");
  const role = (session.user as { role?: string }).role;
  if (role !== "parent") redirect("/dashboard");

  const students = await getLinkedStudents();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-rule px-4 py-3 flex items-center gap-4">
        <span className="font-serif text-lg">HGS</span>
        <nav className="flex gap-3 text-sm">
          <Link href="/dashboard">Home</Link>
          <Link href="/attendance">Attendance</Link>
          <Link href="/announcements">Announcements</Link>
          <Link href="/notifications">Messages</Link>
        </nav>
        <div className="ml-auto">
          <ChildSwitcher children={students} current={null} />
        </div>
      </header>
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(parent)/layout.tsx src/components/parent/child-switcher.tsx
git -c commit.gpgsign=false commit -m "feat(parent): route group layout + child switcher"
```

### Task 25: Parent dashboard, attendance, announcements, notifications pages

**Files:**
- Create: `src/app/(parent)/dashboard/page.tsx`
- Create: `src/app/(parent)/attendance/page.tsx`
- Create: `src/app/(parent)/announcements/page.tsx`
- Create: `src/app/(parent)/notifications/page.tsx`
- Create: `src/components/parent/attendance-month-view.tsx`

- [ ] **Step 1: Dashboard**

```tsx
// src/app/(parent)/dashboard/page.tsx
import Link from "next/link";
import { getLinkedStudents } from "@/server/parent";

export default async function ParentDashboard() {
  const children = await getLinkedStudents();
  if (children.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-serif">Welcome</h1>
        <p className="text-sm text-mute">Your account isn't linked to any students yet. Please contact the school office.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif">Welcome</h1>
      <ul className="space-y-3">
        {children.map((c) => (
          <li key={c.studentId} className="border border-rule rounded p-4">
            <p className="font-medium">{c.firstName} {c.lastName}</p>
            <p className="text-sm text-mute">{c.admissionNo} · {c.className} · {c.sectionName}</p>
            <div className="mt-3 flex gap-3 text-sm">
              <Link href={`/attendance?child=${c.studentId}`} className="underline">Attendance</Link>
              <Link href={`/announcements?child=${c.studentId}`} className="underline">Announcements</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Parent attendance page (read-only month view)**

Add server query to `src/server/parent.ts`:

```ts
import { attendance } from "@/lib/db/schema/communications";
import { and, gte, lte, asc } from "drizzle-orm";

export async function getChildAttendance(studentId: string, monthStart: string, monthEnd: string) {
  const session = await requireParent();
  const phone = (session.user as { phoneNumber?: string }).phoneNumber;
  if (!phone) return [];
  // Defense-in-depth: confirm the studentId belongs to this parent
  const linked = await getLinkedStudents();
  if (!linked.find((s) => s.studentId === studentId)) throw new Error("Not found");
  return db
    .select({ date: attendance.date, status: attendance.status })
    .from(attendance)
    .where(and(eq(attendance.studentId, studentId), gte(attendance.date, monthStart), lte(attendance.date, monthEnd)))
    .orderBy(asc(attendance.date));
}
```

Page:

```tsx
// src/app/(parent)/attendance/page.tsx
import { getLinkedStudents, getChildAttendance } from "@/server/parent";

export default async function ParentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; month?: string }>;
}) {
  const params = await searchParams;
  const children = await getLinkedStudents();
  const childId = params.child ?? children[0]?.studentId;
  if (!childId) return <p className="text-sm text-mute">No children linked.</p>;
  const today = new Date();
  const month = params.month ?? today.toISOString().slice(0, 7);   // YYYY-MM
  const start = `${month}-01`;
  const [y, m] = month.split("-");
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  const rows = await getChildAttendance(childId, start, end);
  const byDate = new Map(rows.map((r) => [r.date, r.status]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-serif">Attendance — {month}</h1>
      <div className="grid grid-cols-7 gap-2 text-center text-xs">
        {Array.from({ length: lastDay }, (_, i) => {
          const day = String(i + 1).padStart(2, "0");
          const status = byDate.get(`${month}-${day}`);
          const cls =
            status === "present" ? "bg-green-100" :
            status === "absent" ? "bg-red-100" :
            status === "late" ? "bg-yellow-100" : "bg-cream";
          return (
            <div key={day} className={`p-2 rounded ${cls}`}>
              <div>{day}</div>
              <div className="text-[10px] uppercase text-mute">{status ?? ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Parent announcements page**

Add to `src/server/announcements.ts`:

```ts
import { sql } from "drizzle-orm";
import { requireParent } from "./session";
import { getLinkedStudents } from "./parent";
import { section } from "@/lib/db/schema/academic";
import { student } from "@/lib/db/schema/people";

export async function listAnnouncementsForParent() {
  await requireParent();
  const linked = await getLinkedStudents();
  if (linked.length === 0) return [];
  // Build set of (classId, sectionId, studentId) the parent's children belong to
  const studentIds = linked.map((l) => l.studentId);
  const sectionRows = await db
    .select({ sectionId: student.currentSectionId, classId: section.classId })
    .from(student)
    .leftJoin(section, eq(section.id, student.currentSectionId))
    .where(inArray(student.id, studentIds));
  const sectionIds = sectionRows.map((r) => r.sectionId).filter(Boolean) as string[];
  const classIds = sectionRows.map((r) => r.classId).filter(Boolean) as string[];

  const items = await db
    .select()
    .from(announcement)
    .orderBy(desc(announcement.sentAt))
    .limit(100);
  // Filter in-app: simpler than building the JSONB filter SQL
  return items.filter((a) => {
    if (a.audienceType === "school") return true;
    const ref = a.audienceRef as { classId?: string; sectionId?: string; studentIds?: string[] } | null;
    if (a.audienceType === "class") return !!ref?.classId && classIds.includes(ref.classId);
    if (a.audienceType === "section") return !!ref?.sectionId && sectionIds.includes(ref.sectionId);
    if (a.audienceType === "students") return Array.isArray(ref?.studentIds) && ref.studentIds.some((id) => studentIds.includes(id));
    return false;
  });
}
```

Page:

```tsx
// src/app/(parent)/announcements/page.tsx
import { listAnnouncementsForParent } from "@/server/announcements";

export default async function ParentAnnouncementsPage() {
  const items = await listAnnouncementsForParent();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-serif">Announcements</h1>
      {items.length === 0 ? (
        <p className="text-sm text-mute">No announcements yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="border border-rule rounded p-4">
              <p className="text-xs text-mute">{new Date(a.sentAt).toLocaleString()}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Parent notifications page**

Add to `src/server/notifications.ts`:

```ts
import { eq, desc } from "drizzle-orm";
import { requireParent } from "./session";

export async function listNotificationsForParent() {
  const session = await requireParent();
  const phone = (session.user as { phoneNumber?: string }).phoneNumber;
  if (!phone) return [];
  return db
    .select()
    .from(notificationLog)
    .where(eq(notificationLog.recipientPhone, phone))
    .orderBy(desc(notificationLog.createdAt))
    .limit(100);
}
```

Page:

```tsx
// src/app/(parent)/notifications/page.tsx
import { listNotificationsForParent } from "@/server/notifications";

export default async function ParentNotificationsPage() {
  const rows = await listNotificationsForParent();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-serif">Messages we've sent you</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-mute">Nothing yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="border border-rule rounded p-3 text-sm">
              <p className="text-xs text-mute">{new Date(r.createdAt).toLocaleString()} · {r.templateKey} · {r.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Smoke test full parent flow**

```bash
pnpm dev
```

1. Visit `/parent-login`, enter a phone that has a parent row + linked students, submit.
2. Open Drizzle Studio (`pnpm drizzle-kit studio`), find the OTP code in `notification_log`.
3. Visit `/parent-login/verify?phone=+91XXXXXXXXXX`, enter the code.
4. Should land on `/dashboard`, see the child's name, links to attendance/announcements/notifications.
5. Click each — they render.

- [ ] **Step 6: Commit**

```bash
git add src/app/(parent) src/server/parent.ts src/server/announcements.ts src/server/notifications.ts
git -c commit.gpgsign=false commit -m "feat(parent): dashboard, attendance month view, announcements, notifications"
```

---

## Slice 8: E2E tests

### Task 26: Update seed for parent role + sample data

**Files:**
- Modify: `scripts/seed.mts`

- [ ] **Step 1: Update seed to create a parent user via OTP signup**

Modify `scripts/seed.mts` — at the end, after staff users:

```ts
  // Phase 1: a sample parent linked to first student
  const samplePhone = "+919999999999";
  const sampleParent = await db.insert(parent).values({
    fullName: "Sample Parent", phone: samplePhone,
  }).returning();
  if (sampleParent[0] && studentRows[0]) {
    await db.insert(parentStudent).values({
      parentId: sampleParent[0].id, studentId: studentRows[0].id, isPrimaryContact: true,
    });
  }
  console.log(`Sample parent phone for testing: ${samplePhone}`);
```

(Add the `parent` and `parentStudent` imports if not already present.)

- [ ] **Step 2: Run seed**

```bash
pnpm seed
```

Expected: completes; final line shows the sample parent phone.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed.mts
git -c commit.gpgsign=false commit -m "chore(seed): add sample parent linked to a student"
```

### Task 27: E2E test for parent OTP flow

**Files:**
- Create: `tests/e2e/parent-otp-flow.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
// tests/e2e/parent-otp-flow.spec.ts
import { test, expect } from "@playwright/test";
import postgres from "postgres";

const SAMPLE_PHONE = "+919999999999";
const sql = postgres(process.env.DATABASE_URL!);

test.beforeEach(async () => {
  // Ensure stub notifier path is taken (default in dev) — clear past attempts and logs for this phone
  await sql`DELETE FROM otp_attempt WHERE phone = ${SAMPLE_PHONE}`;
  await sql`DELETE FROM notification_log WHERE recipient_phone = ${SAMPLE_PHONE}`;
});

test.afterAll(async () => { await sql.end(); });

test("parent OTP login lands on dashboard with linked child", async ({ page }) => {
  await page.goto("/parent-login");
  await page.fill('input[inputmode="numeric"]', "9999999999");
  await page.click('button:has-text("Send code")');
  await page.waitForURL("**/parent-login/verify**");

  // Pull the OTP code from notification_log — the stub notifier persists it in provider_message_id
  // (see Task 9 — stub-only behavior; real MSG91 would put a request_id there instead).
  const rows = await sql`SELECT provider_message_id FROM notification_log WHERE recipient_phone = ${SAMPLE_PHONE} AND template_key = 'parent_otp' AND provider = 'stub' ORDER BY created_at DESC LIMIT 1`;
  const code = rows[0]?.provider_message_id as string;
  expect(code).toBeTruthy();
  expect(code).toMatch(/^\d{6}$/);

  await page.fill('input[inputmode="numeric"]', code);
  await page.click('button:has-text("Verify")');
  await page.waitForURL("**/dashboard");
  await expect(page.locator("h1")).toContainText("Welcome");
});

test("OTP request for unregistered phone returns generic success", async ({ page }) => {
  await page.goto("/parent-login");
  await page.fill('input[inputmode="numeric"]', "9888888888");
  await page.click('button:has-text("Send code")');
  await page.waitForURL("**/parent-login/verify**");
  // Should land on the verify page even though no parent row exists for that phone
});
```

(For the stub path used in dev/E2E, the OTP code is mirrored into `notification_log.provider_message_id` — see Task 9. In production with MSG91, no part of the OTP plaintext is stored locally; Better Auth keeps a hashed verifier in its `verification` table only.)

- [ ] **Step 2: Run E2E**

```bash
pnpm e2e tests/e2e/parent-otp-flow.spec.ts
```

Expected: 2 pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/parent-otp-flow.spec.ts
git -c commit.gpgsign=false commit -m "test(e2e): parent OTP login flow"
```

### Task 28: E2E test for class-teacher attendance marking

**Files:**
- Create: `tests/e2e/attendance-marking.spec.ts`
- Modify: `scripts/seed.mts` (assign sample teacher to a section)

- [ ] **Step 1: Ensure seed creates a teacher with assigned section**

Modify `scripts/seed.mts`. After staff signup, assign the `teacher@hgs.local` user to one section:

```ts
  // Look up the teacher user just created
  const teacherUserRows = await db.select().from(user).where(eq(user.email, "teacher@hgs.local"));
  const teacherUser = teacherUserRows[0];
  if (teacherUser && allSections[0]) {
    await db.insert(teacherAssignment).values({
      userId: teacherUser.id, sectionId: allSections[0].id, academicYearId: yr.id, roleInSection: "class_teacher",
    });
  }
```

(Add `eq` and `teacherAssignment` imports if missing. `allSections` is the variable used earlier in the seed; if its name differs, adapt.)

Re-run seed:

```bash
pnpm seed
```

- [ ] **Step 2: Write the spec**

```ts
// tests/e2e/attendance-marking.spec.ts
import { test, expect } from "@playwright/test";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

test.afterAll(async () => { await sql.end(); });

test("class teacher marks two absent → notifications logged", async ({ page }) => {
  // Use today's date and make sure we start clean for it
  const today = new Date().toISOString().slice(0, 10);
  await sql`DELETE FROM attendance WHERE date = ${today}`;
  await sql`DELETE FROM notification_log WHERE template_key IN ('attendance_absent','attendance_late') AND created_at > NOW() - INTERVAL '1 hour'`;

  await page.goto("/login");
  await page.fill('input[type="email"]', "teacher@hgs.local");
  await page.fill('input[type="password"]', "teacher1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");

  await page.goto("/attendance");
  await expect(page.locator("h1")).toContainText("Attendance");
  // Mark first two students absent
  const rows = page.locator("table tbody tr");
  await expect(rows.first()).toBeVisible();
  await rows.nth(0).locator('input[value="absent"]').check();
  await rows.nth(1).locator('input[value="absent"]').check();
  await page.click('button:has-text("Save attendance")');
  await expect(page.locator("text=/Marked .* notified/")).toBeVisible({ timeout: 5000 });

  // Verify DB: 2 attendance rows for today, 2 notification_log rows for absent
  const attRows = await sql`SELECT COUNT(*)::int AS n FROM attendance WHERE date = ${today} AND status = 'absent'`;
  expect(attRows[0]?.n).toBeGreaterThanOrEqual(2);
  const notifRows = await sql`SELECT COUNT(*)::int AS n FROM notification_log WHERE template_key = 'attendance_absent' AND created_at > NOW() - INTERVAL '1 minute'`;
  expect(notifRows[0]?.n).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 3: Run E2E**

```bash
pnpm e2e tests/e2e/attendance-marking.spec.ts
```

Expected: 1 pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/attendance-marking.spec.ts scripts/seed.mts
git -c commit.gpgsign=false commit -m "test(e2e): class teacher attendance marking + fan-out"
```

### Task 29: E2E test for announcement send

**Files:**
- Create: `tests/e2e/announcement-send.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
// tests/e2e/announcement-send.spec.ts
import { test, expect } from "@playwright/test";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

test.afterAll(async () => { await sql.end(); });

test("super_admin sends school-wide announcement → fan-out logged + dedup applied", async ({ page }) => {
  await sql`DELETE FROM notification_log WHERE template_key = 'announcement' AND created_at > NOW() - INTERVAL '1 hour'`;
  const before = await sql`SELECT COUNT(DISTINCT phone)::int AS n FROM parent`;
  const expectedRecipients = before[0]?.n ?? 0;

  await page.goto("/login");
  await page.fill('input[type="email"]', "admin@hgs.local");
  await page.fill('input[type="password"]', "admin1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");

  await page.goto("/announcements/new");
  await page.locator('input[type="radio"]').first().check();   // Whole school
  await page.fill("textarea", "E2E test announcement");
  await page.click('button:has-text("Send")');
  await expect(page.locator(`text=/Sent to ${expectedRecipients}/`)).toBeVisible({ timeout: 5000 });

  const logs = await sql`SELECT COUNT(*)::int AS n FROM notification_log WHERE template_key = 'announcement' AND created_at > NOW() - INTERVAL '1 minute'`;
  expect(logs[0]?.n).toBe(expectedRecipients);
});
```

- [ ] **Step 2: Run E2E**

```bash
pnpm e2e tests/e2e/announcement-send.spec.ts
```

Expected: 1 pass.

- [ ] **Step 3: Run full unit + E2E suites**

```bash
pnpm test
pnpm e2e
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/announcement-send.spec.ts
git -c commit.gpgsign=false commit -m "test(e2e): announcement send + fan-out dedup"
```

---

## Slice 9: Production deployment

### Task 30: Apply migration to production + set Vercel env vars

**Files:** none (operational task)

- [ ] **Step 1: Apply migration to Neon production branch**

```powershell
$env:DATABASE_URL = "<production connection string from Neon>"
pnpm drizzle-kit migrate
```

Expected: migration `0001_phase_1_attendance_comms` applied with no errors.

- [ ] **Step 2: Verify against production**

```powershell
pnpm tsx scripts/count-rows.mts
```

Expected: shows the 4 new tables with `0`.

- [ ] **Step 3: Set Vercel env vars (Production environment only)**

In Vercel dashboard → Settings → Environment Variables, add for **Production** environment:

| Name | Value |
|---|---|
| `MSG91_AUTH_KEY` | (the one from MSG91 dashboard — mark Sensitive) |
| `MSG91_SENDER_ID` | `HGSPAT` |
| `MSG91_TEMPLATE_ID_PARENT_OTP` | `69f4a31b1275cb72470d9e02` |
| `MSG91_TEMPLATE_ID_ATTENDANCE_ALERT` | (leave blank — flag is off) |
| `MSG91_TEMPLATE_ID_ANNOUNCEMENT` | (leave blank — flag is off) |
| `MSG91_ENABLED_FOR_OTP` | `true` |
| `MSG91_ENABLED_FOR_ATTENDANCE` | `false` |
| `MSG91_ENABLED_FOR_ANNOUNCEMENTS` | `false` |

- [ ] **Step 4: Push branch and merge to main**

```bash
git push -u origin phase-1-attendance-comms
gh pr create --title "Phase 1: attendance + parent communication" --body "Implements the Phase 1 spec. See docs/superpowers/specs/2026-05-01-phase-1-attendance-comms-design.md and the matching plan."
gh pr merge --squash
```

Expected: Vercel auto-deploys main.

- [ ] **Step 5: Real-phone smoke test**

Visit `https://hgs-saas.vercel.app/parent-login`. Enter your own (Director's) 10-digit phone (one that has a parent row inserted via the staff console — you may need to seed one via the staff UI first by adding a sample student linked to your phone). Click Send code.

Expected: SMS arrives within ~10 seconds with format "{6-digit-code} is your OTP for HGS parent portal login. Valid for 10 minutes. Do not share this code. - HGS"

Enter code → land on `/dashboard` → see the linked child.

- [ ] **Step 6: Verify notification_log in production**

Open Neon SQL console (or Drizzle Studio against production):

```sql
SELECT * FROM notification_log ORDER BY created_at DESC LIMIT 5;
```

Expected: a row with `status='sent'`, `provider='msg91'`, `provider_message_id` populated, `template_key='parent_otp'`.

- [ ] **Step 7: Tag the release**

```bash
git checkout main
git pull
git tag -a v0.2.0 -m "Phase 1: attendance + parent communication"
git push origin v0.2.0
```

---

## Done

Phase 1 ships with:
- Class teachers marking attendance with auto parent SMS (currently stubbed; real SMS for any/all channels is now a single env-flag flip away once DLT registration completes for the attendance/announcement templates)
- Real OTP-based parent login over SMS via MSG91 (live in prod)
- Audience-targeted announcements with deduped fan-out (stubbed until DLT)
- Mobile-friendly parent portal with attendance month view, announcements feed, and SMS history
- Full unit + E2E test coverage of business logic
- All defense-in-depth auth layers (middleware, requireAbility / requireParent, permittedStudentIds) extended for the new role and abilities

Next phase: fees (Razorpay).
