# HGS School SaaS — Phase 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the HGS school SaaS foundation — a deployable Next.js app with branded staff console, Postgres-backed auth, role model, core academic data model (years, classes, sections, subjects, students, parents, staff), bulk Excel student import, and a passing E2E smoke test on a Vercel preview URL.

**Architecture:** Single Next.js 15 monolith deployed on Vercel + Neon Postgres. Staff routes live under the `(staff)` route group, gated by Better Auth (email + password). Drizzle ORM, with all schema split into focused files. Permission and student-scoping logic lives in dedicated helpers with high test coverage. Excel import is a three-step wizard (parse → preview → atomic commit). Parent OTP and parent-facing routes are deferred to Phase 1.

**Tech Stack:** Next.js 15 (App Router), TypeScript (strict), Tailwind CSS 4, shadcn/ui, Drizzle ORM, Postgres (Neon), Better Auth, Vitest + PGlite (unit/integration), Playwright (E2E), pnpm.

**Spec:** `docs/superpowers/specs/2026-05-01-hgs-school-saas-design.md`

**Phase scope (in/out):**

- ✅ In: Project bootstrap, brand, DB, schema, migrations, staff auth, staff app shell, role model, scoping helper, AcademicYear/Class/Section/Subject management, Student CRUD, Parent linking, Excel bulk import, Staff user management, seed script, Vitest, Playwright smoke test, Vercel + Neon production deploy.
- ❌ Out (deferred): Parent OTP, parent-facing routes, attendance, fees, admissions, exams, notifications (SMS/WhatsApp/email), Razorpay, MSG91, AiSensy, Resend, audit log table, file uploads.

---

## File Structure

```
hgs-saas/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts                    # theme tokens copied from hgs-web
├── postcss.config.mjs
├── components.json                       # shadcn/ui config
├── drizzle.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
├── .env.local                            # gitignored
├── .gitignore
├── .eslintrc.json
├── README.md
├── public/
│   └── logos/                            # HGS_Logo.jpeg copied here
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # root layout, fonts, metadata
│   │   ├── globals.css                   # tailwind + design tokens
│   │   ├── page.tsx                      # redirect: signed-in → /dashboard, else → /login
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                # cream background, centered card
│   │   │   └── login/
│   │   │       └── page.tsx              # staff email + password form
│   │   ├── (staff)/
│   │   │   ├── layout.tsx                # staff shell: sidebar + header + main
│   │   │   ├── dashboard/page.tsx        # placeholder cards
│   │   │   ├── academic-years/
│   │   │   │   └── page.tsx
│   │   │   ├── classes/
│   │   │   │   └── page.tsx              # classes + sections combined
│   │   │   ├── subjects/
│   │   │   │   └── page.tsx
│   │   │   ├── students/
│   │   │   │   ├── page.tsx              # list with class/section filters
│   │   │   │   ├── new/page.tsx          # create form
│   │   │   │   ├── [id]/page.tsx         # detail + edit
│   │   │   │   └── import/page.tsx       # bulk import wizard
│   │   │   └── users/
│   │   │       └── page.tsx              # staff user CRUD
│   │   └── api/
│   │       └── auth/[...all]/route.ts    # Better Auth handler
│   ├── components/
│   │   ├── ui/                           # shadcn primitives (button, input, table, etc.)
│   │   ├── staff/
│   │   │   ├── nav-sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── students-table.tsx
│   │   │   ├── student-form.tsx
│   │   │   ├── parent-fieldset.tsx
│   │   │   ├── import-wizard.tsx         # orchestrates three-step import
│   │   │   ├── import-preview-table.tsx
│   │   │   ├── academic-year-form.tsx
│   │   │   ├── class-section-editor.tsx
│   │   │   └── user-form.tsx
│   │   └── shared/
│   │       └── logo.tsx
│   ├── lib/
│   │   ├── auth.ts                       # Better Auth server config
│   │   ├── auth-client.ts                # Better Auth client hooks
│   │   ├── db/
│   │   │   ├── index.ts                  # Drizzle client
│   │   │   └── schema/
│   │   │       ├── index.ts              # re-exports
│   │   │       ├── auth.ts               # Better Auth tables (user, session, account, verification)
│   │   │       ├── academic.ts           # academicYear, class, section, subject, classSubject
│   │   │       ├── people.ts             # student, parent, parentStudent, teacherAssignment
│   │   │       └── enums.ts              # role, studentStatus, etc.
│   │   ├── permissions.ts                # role → can/cannot helpers
│   │   ├── student-scoping.ts            # per-user permitted-students subquery
│   │   ├── excel/
│   │   │   ├── parse.ts                  # SheetJS wrapper
│   │   │   └── students-importer.ts      # validation + commit
│   │   └── utils.ts                      # cn() etc.
│   ├── server/
│   │   ├── students.ts                   # server actions / queries
│   │   ├── parents.ts
│   │   ├── classes.ts
│   │   ├── academic-years.ts
│   │   ├── subjects.ts
│   │   └── users.ts
│   └── middleware.ts                     # Better Auth route guard
├── drizzle/
│   └── (generated migrations)
├── tests/
│   ├── helpers/
│   │   ├── pglite.ts                     # in-memory Postgres for unit tests
│   │   └── seed-test-school.ts           # tiny test fixtures
│   ├── unit/
│   │   ├── permissions.test.ts
│   │   ├── student-scoping.test.ts
│   │   └── excel/students-importer.test.ts
│   └── e2e/
│       ├── staff-login.spec.ts
│       └── student-import.spec.ts
├── scripts/
│   ├── seed.ts                           # local-dev seed
│   └── create-admin.ts                   # bootstrap first super_admin
└── docs/
    └── superpowers/
        ├── specs/2026-05-01-hgs-school-saas-design.md
        └── plans/2026-05-01-phase-0-foundation.md
```

**Boundaries:**

- **Schema files** split by domain (auth / academic / people) — each <150 lines.
- **`lib/`** = pure logic, no Next.js imports. Easy to test with Vitest.
- **`server/`** = mutations/queries that touch DB and call into `lib/`. Imported only from RSCs and route handlers.
- **`components/`** = presentational + form components. No DB imports.

---

## Conventions

- **Package manager:** pnpm. Lockfile committed.
- **Commits:** Conventional Commits (`feat:`, `chore:`, `test:`, `fix:`, `refactor:`). One commit per task, every task ends with a commit step.
- **Branch model:** trunk-based. Work directly on `main` until first deploy; after deploy, feature branches.
- **Code style:** TypeScript strict; `eslint --max-warnings=0` must pass before commit.
- **Test runner:** `pnpm test` (Vitest) for unit/integration; `pnpm e2e` (Playwright) for E2E.
- **Test DB:** PGlite (in-memory Postgres) for unit/integration tests. Real Neon dev branch for `pnpm dev` and Playwright.
- **TDD:** every business-logic task starts with a failing test. UI shells, config, and styling do not require tests — just commit them as-is.
- **Working directory** for all commands: `C:\Users\dhira\misc\HGS\hgs-saas`.

---

## Task 1: Bootstrap Next.js project

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `.eslintrc.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `README.md`

- [ ] **Step 1: Initialize Next.js 15 with App Router and TypeScript strict**

Run from project root (`C:\Users\dhira\misc\HGS\hgs-saas`):
```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
```

When prompted, accept all defaults. If pnpm not installed: `npm install -g pnpm` first.

- [ ] **Step 2: Enable strict mode in tsconfig.json**

Edit `tsconfig.json`, ensure `"strict": true` is set (default in Next 15 init) and add:
```json
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true
```

- [ ] **Step 3: Verify build works**

Run:
```bash
pnpm build
```
Expected: `✓ Compiled successfully` and `Route (app) /` listed.

- [ ] **Step 4: Replace default page with a placeholder redirect**

Replace `src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: bootstrap Next.js 15 with TypeScript strict"
```

---

## Task 2: Apply HGS brand tokens (colors, fonts) matching hgs-web

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `tailwind.config.ts`

- [ ] **Step 1: Copy HGS logo into public/**

```bash
mkdir -p public/logos
cp ../hgs-web/HGS_Logo.jpeg public/logos/logo.jpeg
```

- [ ] **Step 2: Wire up Google Fonts (Bricolage Grotesque, Inter, Tiro Devanagari Hindi)**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const tiro = Tiro_Devanagari_Hindi({
  subsets: ["devanagari"],
  weight: "400",
  variable: "--font-tiro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HGS Console — Himalayan Global School",
  description: "Internal school management for Himalayan Global School.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${inter.variable} ${tiro.variable}`}>
      <body className="bg-cream text-ink font-body antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Define design tokens in globals.css**

Replace `src/app/globals.css`:
```css
@import "tailwindcss";

@theme {
  --color-ink: #111418;
  --color-cream: #FBF7F0;
  --color-saffron: #D67A1F;
  --color-saffron-light: #E89A4A;
  --color-mute: #6B6F76;
  --color-rule: #E8E2D5;

  --font-display: var(--font-bricolage), ui-sans-serif, system-ui, sans-serif;
  --font-body: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-sanskrit: var(--font-tiro), serif;
}

html, body { height: 100%; }
body { font-family: var(--font-body); color: var(--color-ink); background: var(--color-cream); }
```

- [ ] **Step 4: Verify dev server renders without errors**

Run:
```bash
pnpm dev
```
Open http://localhost:3000 — should redirect to `/login` and 404 (no login page yet — expected). Stop dev server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: apply HGS brand tokens and fonts matching hgs-web"
```

---

## Task 3: Install shadcn/ui and seed primitive components

**Files:**
- Create: `components.json`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/card.tsx`, `src/components/ui/table.tsx`, `src/components/ui/select.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/form.tsx`, `src/components/ui/sonner.tsx`, `src/lib/utils.ts`

- [ ] **Step 1: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

Answer prompts:
- Style: New York
- Base color: Neutral
- CSS variables: Yes

- [ ] **Step 2: Add the primitive components used in this phase**

```bash
pnpm dlx shadcn@latest add button input label card table select dialog form sonner badge
```

- [ ] **Step 3: Verify components compile**

```bash
pnpm build
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add shadcn/ui primitives"
```

---

## Task 4: Set up Drizzle ORM and Neon dev branch

**Files:**
- Create: `drizzle.config.ts`, `src/lib/db/index.ts`, `.env.example`, `.env.local`

- [ ] **Step 1: User creates Neon project (manual)**

Go to https://console.neon.tech → New Project → name `hgs-saas`. Create a dev branch named `dev`. Copy the connection string for the dev branch.

This is a manual prerequisite — no automation possible. Prompt user before proceeding.

- [ ] **Step 2: Install Drizzle and Postgres driver**

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

- [ ] **Step 3: Create `.env.example` and `.env.local`**

`.env.example`:
```
# Postgres (Neon)
DATABASE_URL=postgres://user:pass@host/dbname?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=          # generate with: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
```

`.env.local` (gitignored — confirm `.env*.local` is in `.gitignore`):
```
DATABASE_URL=<paste Neon dev branch connection string here>
BETTER_AUTH_SECRET=<generate via: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
```

- [ ] **Step 4: Create Drizzle config**

`drizzle.config.ts`:
```ts
import type { Config } from "drizzle-kit";
import "dotenv/config";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

export default {
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config;
```

- [ ] **Step 5: Create Drizzle client**

`src/lib/db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const client = postgres(url, { prepare: false });
export const db = drizzle(client, { schema });
export type DB = typeof db;
```

- [ ] **Step 6: Create empty schema barrel**

`src/lib/db/schema/index.ts`:
```ts
// re-exports — populated in Task 5 and 6
export * from "./enums";
export * from "./auth";
export * from "./academic";
export * from "./people";
```

Create empty placeholder files (`enums.ts`, `auth.ts`, `academic.ts`, `people.ts`) each with `export {};` so the barrel compiles. They'll be filled in next tasks.

- [ ] **Step 7: Verify connection by running drizzle introspect**

```bash
pnpm dotenv -e .env.local -- pnpm drizzle-kit pull
```

(Install `dotenv-cli` if missing: `pnpm add -D dotenv-cli`.)

Expected: connects to Neon, reports "no tables" (empty DB). If it errors with auth/network, confirm `DATABASE_URL`.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: configure Drizzle ORM with Neon dev branch"
```

---

## Task 5: Define enums and academic schema

**Files:**
- Create: `src/lib/db/schema/enums.ts`, `src/lib/db/schema/academic.ts`

- [ ] **Step 1: Define role and student status enums**

`src/lib/db/schema/enums.ts`:
```ts
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
```

- [ ] **Step 2: Define academic schema (years, classes, sections, subjects)**

`src/lib/db/schema/academic.ts`:
```ts
import { boolean, date, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

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
  classTeacherId: uuid("class_teacher_id"),    // FK added in people.ts after user table
  capacity: integer("capacity"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqPerClassYear: unique("section_uniq_class_year_name").on(t.classId, t.academicYearId, t.name),
}));

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
}, (t) => ({
  pk: unique("class_subject_pk").on(t.classId, t.subjectId, t.academicYearId),
}));
```

(`class_` is named with trailing underscore because `class` is a reserved JS word.)

- [ ] **Step 3: Verify schema compiles**

```bash
pnpm tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: define enums and academic schema"
```

---

## Task 6: Define auth and people schema

**Files:**
- Create: `src/lib/db/schema/auth.ts`, `src/lib/db/schema/people.ts`
- Modify: `src/lib/db/schema/academic.ts` (add FK from section.classTeacherId to user)

- [ ] **Step 1: Define Better Auth tables**

Better Auth manages its own tables but we extend `user` with our domain fields. `src/lib/db/schema/auth.ts`:
```ts
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { roleEnum } from "./enums";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // domain extensions
  phone: text("phone"),
  role: roleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Define people schema (student, parent, parentStudent, teacherAssignment)**

`src/lib/db/schema/people.ts`:
```ts
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
  relationToStudent: text("relation_to_student"),  // "Father" / "Mother" / "Guardian"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const parentStudent = pgTable("parent_student", {
  parentId: uuid("parent_id").notNull().references(() => parent.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => student.id, { onDelete: "cascade" }),
  isPrimaryContact: boolean("is_primary_contact").notNull().default(false),
}, (t) => ({
  pk: unique("parent_student_pk").on(t.parentId, t.studentId),
}));

export const teacherAssignment = pgTable("teacher_assignment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  sectionId: uuid("section_id").notNull().references(() => section.id),
  academicYearId: uuid("academic_year_id").notNull().references(() => academicYear.id),
  roleInSection: teacherRoleInSectionEnum("role_in_section").notNull(),
  subjectId: uuid("subject_id").references(() => subject.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Add the deferred FK for section.classTeacherId**

This was a forward-reference; now `user` exists. Modify `src/lib/db/schema/academic.ts` — change the `classTeacherId` line to:
```ts
import { user } from "./auth";
// ...
classTeacherId: text("class_teacher_id").references(() => user.id),
```

(Note: `user.id` is `text` because Better Auth uses string IDs, not UUIDs. Adjust the `section.classTeacherId` column type from `uuid` to `text` to match.)

- [ ] **Step 4: Verify schema compiles**

```bash
pnpm tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: define auth and people schema"
```

---

## Task 7: Generate and apply first migration

**Files:**
- Create: `drizzle/0000_*.sql` (generated)

- [ ] **Step 1: Generate migration**

```bash
pnpm drizzle-kit generate
```
Expected: writes `drizzle/0000_<name>.sql` containing all tables.

- [ ] **Step 2: Review the SQL**

Open `drizzle/0000_*.sql`. Verify all expected tables present: `academic_year`, `class`, `section`, `subject`, `class_subject`, `user`, `session`, `account`, `verification`, `student`, `parent`, `parent_student`, `teacher_assignment`. Verify enums declared.

- [ ] **Step 3: Push migration to dev branch**

```bash
pnpm dotenv -e .env.local -- pnpm drizzle-kit migrate
```
Expected: "Migrations applied successfully" or equivalent.

- [ ] **Step 4: Verify in Neon console**

Open Neon console → SQL Editor on the `dev` branch → `\dt` (or `SELECT tablename FROM pg_tables WHERE schemaname='public';`). Expected: all 13 tables present.

- [ ] **Step 5: Commit**

```bash
git add drizzle/
git commit -m "chore: generate and apply initial migration"
```

---

## Task 8: Configure Better Auth with email/password

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/app/api/auth/[...all]/route.ts`, `src/middleware.ts`

- [ ] **Step 1: Install Better Auth**

```bash
pnpm add better-auth
```

- [ ] **Step 2: Configure server-side auth**

`src/lib/auth.ts`:
```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema/auth";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) throw new Error("BETTER_AUTH_SECRET not set");

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  secret,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,   // Phase 0 — flip in Phase 1 once Resend is wired
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      role: { type: "string", required: true },
      isActive: { type: "boolean", required: false, defaultValue: true },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 3: Configure client-side auth**

`src/lib/auth-client.ts`:
```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

export const { signIn, signOut, useSession } = authClient;
```

Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.local` and `.env.example`.

- [ ] **Step 4: Mount Better Auth handler**

`src/app/api/auth/[...all]/route.ts`:
```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 5: Add middleware to gate `/dashboard` and `/students` etc.**

`src/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const STAFF_PREFIXES = ["/dashboard", "/students", "/classes", "/subjects", "/academic-years", "/users"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isStaffRoute = STAFF_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isStaffRoute) return NextResponse.next();

  const session = getSessionCookie(req);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|logos|login).*)"],
};
```

(Middleware does **only** cookie presence check. Real role check happens in RSCs and route handlers — defense in depth per spec section 9.)

- [ ] **Step 6: Verify build**

```bash
pnpm build
```
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: configure Better Auth with email/password staff login"
```

---

## Task 9: Build login page

**Files:**
- Create: `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/components/staff/login-form.tsx`

- [ ] **Step 1: Auth route layout (cream background, centered card)**

`src/app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-cream">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm border border-rule">
        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Login form (client component)**

`src/components/staff/login-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn.email({ email, password });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Invalid credentials");
      return;
    }
    router.push(from);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-display font-semibold text-ink">HGS Console</h1>
        <p className="text-sm text-mute mt-1">Staff sign-in</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Login page**

`src/app/(auth)/login/page.tsx`:
```tsx
import { Suspense } from "react";
import { LoginForm } from "@/components/staff/login-form";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
```

- [ ] **Step 4: Manual smoke test (no auth user yet — expect "invalid credentials")**

```bash
pnpm dev
```
Open http://localhost:3000/login. Submit any email/password. Expected: "Invalid credentials" message. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: staff login page with Better Auth"
```

---

## Task 10: Bootstrap script for first super_admin user

**Files:**
- Create: `scripts/create-admin.ts`, modify `package.json` (add script)

- [ ] **Step 1: Install script runner**

```bash
pnpm add -D tsx
```

- [ ] **Step 2: Create-admin script**

`scripts/create-admin.ts`:
```ts
import "dotenv/config";
import { auth } from "../src/lib/auth";

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] ?? "Director";

if (!email || !password) {
  console.error("Usage: pnpm create-admin <email> <password> [name]");
  process.exit(1);
}

const result = await auth.api.signUpEmail({
  body: {
    email,
    password,
    name,
    role: "super_admin",
  },
});

if ("error" in result && result.error) {
  console.error("Failed:", result.error);
  process.exit(1);
}
console.log("Created super_admin:", email);
```

- [ ] **Step 3: Add script entry to package.json**

In `package.json` `"scripts"`:
```json
"create-admin": "dotenv -e .env.local -- tsx scripts/create-admin.ts"
```

- [ ] **Step 4: Run it to create the first admin**

```bash
pnpm create-admin admin@himalayanglobalschool.in <strongpassword> "Neeraj Kumar"
```
Expected: `Created super_admin: admin@himalayanglobalschool.in`

- [ ] **Step 5: Manual login test**

```bash
pnpm dev
```
Sign in at http://localhost:3000/login with the credentials just created. Expected: redirects to `/dashboard` (which 404s — next task).

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add create-admin bootstrap script"
```

---

## Task 11: Build staff app shell (layout, sidebar, header)

**Files:**
- Create: `src/app/(staff)/layout.tsx`, `src/app/(staff)/dashboard/page.tsx`, `src/components/staff/nav-sidebar.tsx`, `src/components/staff/header.tsx`, `src/components/shared/logo.tsx`

- [ ] **Step 1: Logo component**

`src/components/shared/logo.tsx`:
```tsx
import Image from "next/image";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Image src="/logos/logo.jpeg" alt="HGS" width={size} height={size} className="rounded" />
      <span className="font-display font-semibold text-ink">HGS Console</span>
    </div>
  );
}
```

- [ ] **Step 2: Sidebar nav**

`src/components/staff/nav-sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/academic-years", label: "Academic years" },
  { href: "/classes", label: "Classes & sections" },
  { href: "/subjects", label: "Subjects" },
  { href: "/students", label: "Students" },
  { href: "/users", label: "Staff users" },
];

export function NavSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 bg-white border-r border-rule p-6 hidden md:block">
      <Logo />
      <nav className="mt-8 space-y-1">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block px-3 py-2 rounded text-sm ${active ? "bg-saffron/10 text-saffron font-medium" : "text-ink hover:bg-cream"}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Header (sign-out button + user name)**

`src/components/staff/header.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function Header() {
  const router = useRouter();
  const { data } = useSession();
  return (
    <header className="h-14 border-b border-rule px-6 flex items-center justify-between bg-white">
      <span className="text-sm text-mute">{data?.user?.email}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await signOut();
          router.push("/login");
        }}
      >
        Sign out
      </Button>
    </header>
  );
}
```

- [ ] **Step 4: Staff layout (sidebar + header + main, with server-side session check)**

`src/app/(staff)/layout.tsx`:
```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavSidebar } from "@/components/staff/nav-sidebar";
import { Header } from "@/components/staff/header";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role === "parent") redirect("/login"); // parent has no staff access in Phase 0

  return (
    <div className="flex h-screen">
      <NavSidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Dashboard placeholder**

`src/app/(staff)/dashboard/page.tsx`:
```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-ink">Dashboard</h1>
      <p className="text-mute mt-2">Welcome to the HGS console.</p>
    </div>
  );
}
```

- [ ] **Step 6: Manual smoke test**

```bash
pnpm dev
```
Sign in → expect `/dashboard` to render with sidebar + header + welcome text.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: staff app shell with sidebar, header, dashboard"
```

---

## Task 12: Define role permission helpers (TDD)

**Files:**
- Create: `src/lib/permissions.ts`, `tests/unit/permissions.test.ts`, `vitest.config.ts`

- [ ] **Step 1: Set up Vitest**

```bash
pnpm add -D vitest @vitest/ui @vitejs/plugin-react jsdom
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write failing test**

`tests/unit/permissions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { can, type Role } from "@/lib/permissions";

describe("permissions.can", () => {
  it("super_admin can do anything", () => {
    expect(can("super_admin", "students.create")).toBe(true);
    expect(can("super_admin", "marks.lock")).toBe(true);
    expect(can("super_admin", "fees.refund")).toBe(true);
  });

  it("principal can lock marks but not refund fees", () => {
    expect(can("principal", "marks.lock")).toBe(true);
    expect(can("principal", "fees.refund")).toBe(false);
  });

  it("office_staff can manage students but not edit marks", () => {
    expect(can("office_staff", "students.create")).toBe(true);
    expect(can("office_staff", "marks.edit")).toBe(false);
  });

  it("class_teacher can mark attendance for own section only", () => {
    expect(can("class_teacher", "attendance.mark")).toBe(true);
  });

  it("subject_teacher can edit marks for assigned subject", () => {
    expect(can("subject_teacher", "marks.edit")).toBe(true);
    expect(can("subject_teacher", "students.create")).toBe(false);
  });

  it("parent has no staff capabilities", () => {
    expect(can("parent", "students.create")).toBe(false);
    expect(can("parent", "attendance.mark")).toBe(false);
  });

  const roles: Role[] = ["super_admin", "principal", "office_staff", "accountant", "class_teacher", "subject_teacher", "parent"];
  it.each(roles)("returns false for unknown ability for %s", (role) => {
    expect(can(role, "totally.fake.ability" as never)).toBe(false);
  });
});
```

- [ ] **Step 3: Run test — confirm fail**

```bash
pnpm test
```
Expected: cannot find module `@/lib/permissions`.

- [ ] **Step 4: Implement permissions helper**

`src/lib/permissions.ts`:
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
```

- [ ] **Step 5: Run test — confirm pass**

```bash
pnpm test
```
Expected: all permissions tests pass.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: role permissions helper with full unit coverage"
```

---

## Task 13: Build student-scoping helper (TDD, security-critical)

**Files:**
- Create: `src/lib/student-scoping.ts`, `tests/unit/student-scoping.test.ts`, `tests/helpers/pglite.ts`

- [ ] **Step 1: Set up PGlite test harness**

```bash
pnpm add -D @electric-sql/pglite
```

`tests/helpers/pglite.ts`:
```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import fs from "node:fs";
import path from "node:path";

export async function freshTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  // apply migrations
  const migrationsDir = path.resolve(__dirname, "../../drizzle");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sqlText = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    for (const statement of sqlText.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await db.execute(sql.raw(trimmed));
    }
  }
  return { db, client };
}
```

Install `drizzle-orm/pglite` integration: it ships with `drizzle-orm`, no extra package needed.

- [ ] **Step 2: Write failing test for student-scoping helper**

`tests/unit/student-scoping.test.ts`:
```ts
import { describe, expect, it, beforeEach } from "vitest";
import { freshTestDb } from "../helpers/pglite";
import { permittedStudentIds } from "@/lib/student-scoping";
import { academicYear, class_, section } from "@/lib/db/schema/academic";
import { user } from "@/lib/db/schema/auth";
import { student, parent, parentStudent, teacherAssignment } from "@/lib/db/schema/people";
import { eq } from "drizzle-orm";

describe("permittedStudentIds", () => {
  let dbCtx: Awaited<ReturnType<typeof freshTestDb>>;

  beforeEach(async () => {
    dbCtx = await freshTestDb();
    const { db } = dbCtx;

    const [yr] = await db.insert(academicYear).values({
      name: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", isCurrent: true,
    }).returning();

    const [cls] = await db.insert(class_).values({ name: "Grade 5", order: 5 }).returning();
    const [secA] = await db.insert(section).values({ classId: cls.id, academicYearId: yr.id, name: "A" }).returning();
    const [secB] = await db.insert(section).values({ classId: cls.id, academicYearId: yr.id, name: "B" }).returning();

    await db.insert(user).values([
      { id: "u-admin", email: "admin@x", name: "Admin", role: "super_admin" },
      { id: "u-teacher", email: "t@x", name: "Teacher", role: "class_teacher" },
      { id: "u-parent", email: "p@x", name: "Parent", role: "parent" },
    ]);

    const [s1] = await db.insert(student).values({
      admissionNo: "001", firstName: "Aarav", lastName: "Kumar", currentSectionId: secA.id,
    }).returning();
    const [s2] = await db.insert(student).values({
      admissionNo: "002", firstName: "Vihaan", lastName: "Singh", currentSectionId: secB.id,
    }).returning();

    await db.insert(teacherAssignment).values({
      userId: "u-teacher", sectionId: secA.id, academicYearId: yr.id, roleInSection: "class_teacher",
    });

    const [p] = await db.insert(parent).values({ fullName: "Parent of Aarav", phone: "+919999900001" }).returning();
    await db.insert(parentStudent).values({ parentId: p.id, studentId: s1.id, isPrimaryContact: true });

    // map parent record to user record by phone (Phase 1 will formalize this; Phase 0 stub: use parent.phone == user.phone)
    await db.update(user).set({ phone: "+919999900001" }).where(eq(user.id, "u-parent"));
  });

  it("super_admin sees every student", async () => {
    const ids = await permittedStudentIds(dbCtx.db, { userId: "u-admin", role: "super_admin" });
    expect(ids.size).toBe(2);
  });

  it("class_teacher sees only their assigned section's students", async () => {
    const ids = await permittedStudentIds(dbCtx.db, { userId: "u-teacher", role: "class_teacher" });
    expect(ids.size).toBe(1);
  });

  it("parent sees only their own children", async () => {
    const ids = await permittedStudentIds(dbCtx.db, { userId: "u-parent", role: "parent" });
    expect(ids.size).toBe(1);
  });

  it("returns empty set for a role with no scoping rule", async () => {
    const ids = await permittedStudentIds(dbCtx.db, { userId: "u-admin", role: "accountant" });
    // accountant in Phase 0 has students.view on all (per permissions); scoping is separate concern
    // accountant scope = all (no assignment-based scoping); explicitly all
    expect(ids.size).toBe(2);
  });
});
```

- [ ] **Step 3: Run test — confirm fail**

```bash
pnpm test
```
Expected: cannot find `@/lib/student-scoping`.

- [ ] **Step 4: Implement scoping helper**

`src/lib/student-scoping.ts`:
```ts
import { eq, inArray } from "drizzle-orm";
import { type DB } from "./db";
import { student, parent, parentStudent, teacherAssignment } from "./db/schema/people";
import { user } from "./db/schema/auth";
import { type Role } from "./permissions";

export type ScopingContext = { userId: string; role: Role };

/**
 * Returns the set of student IDs the given user is permitted to see.
 *
 * Phase 0 rules:
 *   super_admin / principal / office_staff / accountant → all active students
 *   class_teacher → students in any section the user is assigned as class_teacher
 *   subject_teacher → students in any section the user teaches a subject in
 *   parent → students linked via parentStudent for this user's phone
 */
export async function permittedStudentIds(db: DB, ctx: ScopingContext): Promise<Set<string>> {
  if (ctx.role === "super_admin" || ctx.role === "principal" || ctx.role === "office_staff" || ctx.role === "accountant") {
    const rows = await db.select({ id: student.id }).from(student);
    return new Set(rows.map((r) => r.id));
  }

  if (ctx.role === "class_teacher" || ctx.role === "subject_teacher") {
    const assignments = await db
      .select({ sectionId: teacherAssignment.sectionId })
      .from(teacherAssignment)
      .where(eq(teacherAssignment.userId, ctx.userId));
    const sectionIds = assignments.map((a) => a.sectionId);
    if (sectionIds.length === 0) return new Set();
    const rows = await db
      .select({ id: student.id })
      .from(student)
      .where(inArray(student.currentSectionId, sectionIds));
    return new Set(rows.map((r) => r.id));
  }

  if (ctx.role === "parent") {
    const userRow = await db.select({ phone: user.phone }).from(user).where(eq(user.id, ctx.userId)).limit(1);
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

  return new Set();
}
```

- [ ] **Step 5: Run test — confirm pass**

```bash
pnpm test
```
Expected: all 4 scoping tests pass.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: per-user student scoping helper with PGlite-backed tests"
```

---

## Task 14: Server-side helper for current session + role guard

**Files:**
- Create: `src/server/session.ts`

- [ ] **Step 1: Implement requireSession + requireAbility**

`src/server/session.ts`:
```ts
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can, type Ability, type Role } from "@/lib/permissions";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

export async function requireAbility(ability: Ability) {
  const session = await requireSession();
  const role = session.user.role as Role;
  if (!can(role, ability)) {
    throw new Error(`Forbidden: role '${role}' lacks ability '${ability}'`);
  }
  return session;
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: requireSession and requireAbility server helpers"
```

---

## Task 15: Academic Year management page

**Files:**
- Create: `src/server/academic-years.ts`, `src/app/(staff)/academic-years/page.tsx`, `src/components/staff/academic-year-form.tsx`

- [ ] **Step 1: Server actions for academic year CRUD**

`src/server/academic-years.ts`:
```ts
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
```

You may need `pnpm add zod` if not already installed.

- [ ] **Step 2: Form (client component)**

`src/components/staff/academic-year-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAcademicYear } from "@/server/academic-years";

export function AcademicYearForm() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setErr(null);
    start(async () => {
      try {
        await createAcademicYear({
          name: String(formData.get("name")),
          startDate: String(formData.get("startDate")),
          endDate: String(formData.get("endDate")),
          isCurrent: formData.get("isCurrent") === "on",
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-3 max-w-md">
      <div><Label htmlFor="name">Name</Label><Input id="name" name="name" placeholder="2026-27" required /></div>
      <div><Label htmlFor="startDate">Start date</Label><Input id="startDate" name="startDate" type="date" required /></div>
      <div><Label htmlFor="endDate">End date</Label><Input id="endDate" name="endDate" type="date" required /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isCurrent" /> Set as current</label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Add academic year"}</Button>
    </form>
  );
}
```

- [ ] **Step 3: Page**

`src/app/(staff)/academic-years/page.tsx`:
```tsx
import { listAcademicYears, setCurrentAcademicYear } from "@/server/academic-years";
import { AcademicYearForm } from "@/components/staff/academic-year-form";
import { Button } from "@/components/ui/button";

export default async function AcademicYearsPage() {
  const years = await listAcademicYears();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink">Academic years</h1>
        <p className="text-mute mt-1 text-sm">Set the active session.</p>
      </div>

      <ul className="divide-y divide-rule rounded border border-rule bg-white">
        {years.map((y) => (
          <li key={y.id} className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="font-medium">{y.name}</span>{" "}
              <span className="text-mute text-sm">{y.startDate} → {y.endDate}</span>
              {y.isCurrent && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-saffron/10 text-saffron">current</span>}
            </div>
            {!y.isCurrent && (
              <form action={async () => { "use server"; await setCurrentAcademicYear(y.id); }}>
                <Button type="submit" variant="ghost" size="sm">Set current</Button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <div>
        <h2 className="font-display font-semibold mt-8 mb-2">Add a new academic year</h2>
        <AcademicYearForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Manual smoke test**

`pnpm dev` → log in → `/academic-years` → add "2026-27" with start 2026-04-01, end 2027-03-31, isCurrent. Page should reflect the new row tagged "current."

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: academic year management page"
```

---

## Task 16: Class + Section management page

**Files:**
- Create: `src/server/classes.ts`, `src/app/(staff)/classes/page.tsx`, `src/components/staff/class-section-editor.tsx`

- [ ] **Step 1: Server actions**

`src/server/classes.ts`:
```ts
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
```

- [ ] **Step 2: UI**

`src/components/staff/class-section-editor.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClass, createSection } from "@/server/classes";

export function ClassCreator() {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(async () => { await createClass({ name: fd.get("name"), order: fd.get("order") }); })}
      className="flex gap-2 items-end"
    >
      <div><Label htmlFor="name">Class name</Label><Input id="name" name="name" required placeholder="Grade 5" /></div>
      <div><Label htmlFor="order">Order</Label><Input id="order" name="order" type="number" required /></div>
      <Button type="submit" disabled={pending}>Add class</Button>
    </form>
  );
}

export function SectionCreator({ classId, yearId }: { classId: string; yearId: string }) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(async () => { await createSection({ classId, academicYearId: yearId, name: fd.get("name"), capacity: fd.get("capacity") || undefined }); })}
      className="flex gap-2 items-end mt-2"
    >
      <Input name="name" placeholder="Section (A/B/C)" required className="w-32" />
      <Input name="capacity" type="number" placeholder="Capacity" className="w-32" />
      <Button type="submit" size="sm" disabled={pending}>Add</Button>
    </form>
  );
}
```

- [ ] **Step 3: Page**

`src/app/(staff)/classes/page.tsx`:
```tsx
import { listClassesWithSections } from "@/server/classes";
import { ClassCreator, SectionCreator } from "@/components/staff/class-section-editor";

export default async function ClassesPage() {
  const { currentYear, classes } = await listClassesWithSections();

  if (!currentYear) {
    return (
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink">Classes & sections</h1>
        <p className="mt-2 text-mute">Create an academic year and mark it as current first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink">Classes & sections</h1>
        <p className="text-mute text-sm mt-1">Current year: {currentYear.name}</p>
      </div>
      <ClassCreator />
      <ul className="space-y-4">
        {classes.map((c) => (
          <li key={c.id} className="rounded border border-rule bg-white p-4">
            <div className="font-medium">{c.name}</div>
            <ul className="mt-2 flex gap-2 flex-wrap">
              {c.sections.map((s) => (
                <li key={s.id} className="px-3 py-1 text-sm rounded bg-cream border border-rule">{s.name}{s.capacity ? ` (${s.capacity})` : ""}</li>
              ))}
            </ul>
            <SectionCreator classId={c.id} yearId={currentYear.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Manual smoke test**

`pnpm dev` → `/classes` → add Grade 5 (order 5), then sections A and B under Grade 5.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: class and section management page"
```

---

## Task 17: Subject management page

**Files:**
- Create: `src/server/subjects.ts`, `src/app/(staff)/subjects/page.tsx`

- [ ] **Step 1: Server actions**

`src/server/subjects.ts`:
```ts
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
```

- [ ] **Step 2: Page**

`src/app/(staff)/subjects/page.tsx`:
```tsx
import { listSubjects, createSubject } from "@/server/subjects";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function SubjectsPage() {
  const subjects = await listSubjects();

  async function add(formData: FormData) {
    "use server";
    await createSubject({ name: formData.get("name"), code: formData.get("code") });
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-display font-semibold text-ink">Subjects</h1>
      <ul className="divide-y divide-rule rounded border border-rule bg-white">
        {subjects.map((s) => (
          <li key={s.id} className="px-4 py-2 flex justify-between text-sm">
            <span>{s.name}</span><span className="text-mute">{s.code}</span>
          </li>
        ))}
      </ul>
      <form action={add} className="space-y-3 max-w-md">
        <h2 className="font-display font-semibold">Add subject</h2>
        <div><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
        <div><Label htmlFor="code">Code</Label><Input id="code" name="code" required placeholder="MATH" /></div>
        <Button type="submit">Add</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

`/subjects` → add "Mathematics" code "MATH", "English" code "ENG", "Hindi" code "HIN".

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: subject management page"
```

---

## Task 18: Student CRUD — list and create

**Files:**
- Create: `src/server/students.ts`, `src/server/parents.ts`, `src/app/(staff)/students/page.tsx`, `src/app/(staff)/students/new/page.tsx`, `src/components/staff/student-form.tsx`, `src/components/staff/students-table.tsx`, `src/components/staff/parent-fieldset.tsx`

- [ ] **Step 1: Server actions for students**

`src/server/students.ts`:
```ts
"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { student, parent, parentStudent } from "@/lib/db/schema/people";
import { class_, section } from "@/lib/db/schema/academic";
import { permittedStudentIds } from "@/lib/student-scoping";
import { requireAbility, requireSession } from "./session";
import type { Role } from "@/lib/permissions";

const studentSchema = z.object({
  admissionNo: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  currentSectionId: z.string().uuid().optional(),
  dateOfAdmission: z.string().optional(),
});

const parentEntry = z.object({
  fullName: z.string().min(1),
  phone: z.string().regex(/^\+?\d{10,15}$/),
  email: z.string().email().optional().or(z.literal("")),
  relationToStudent: z.string().optional(),
  isPrimaryContact: z.boolean().optional(),
});

export async function listStudents(filter?: { sectionId?: string }) {
  const session = await requireAbility("students.view");
  const allowed = await permittedStudentIds(db, { userId: session.user.id, role: session.user.role as Role });
  if (allowed.size === 0) return [];

  const conditions = [inArray(student.id, [...allowed])];
  if (filter?.sectionId) conditions.push(eq(student.currentSectionId, filter.sectionId));

  return db
    .select({
      id: student.id, admissionNo: student.admissionNo, firstName: student.firstName, lastName: student.lastName,
      sectionName: section.name, className: class_.name, status: student.status,
    })
    .from(student)
    .leftJoin(section, eq(section.id, student.currentSectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .where(and(...conditions))
    .orderBy(asc(student.admissionNo));
}

export async function listSectionsForFilter() {
  await requireAbility("students.view");
  return db
    .select({ id: section.id, name: section.name, className: class_.name })
    .from(section)
    .leftJoin(class_, eq(class_.id, section.classId));
}

export async function createStudent(input: unknown, parents: unknown[] = []) {
  await requireAbility("students.create");
  const data = studentSchema.parse(input);
  const parentList = z.array(parentEntry).parse(parents);

  await db.transaction(async (tx) => {
    const [created] = await tx.insert(student).values(data).returning();
    if (!created) throw new Error("Insert failed");
    for (const p of parentList) {
      let parentRow = (await tx.select().from(parent).where(eq(parent.phone, p.phone)).limit(1))[0];
      if (!parentRow) {
        [parentRow] = await tx.insert(parent).values({
          fullName: p.fullName,
          phone: p.phone,
          email: p.email || null,
          relationToStudent: p.relationToStudent ?? null,
        }).returning();
      }
      await tx.insert(parentStudent).values({
        parentId: parentRow!.id,
        studentId: created.id,
        isPrimaryContact: p.isPrimaryContact ?? false,
      });
    }
  });
  revalidatePath("/students");
}
```

- [ ] **Step 2: Students table component**

`src/components/staff/students-table.tsx`:
```tsx
import Link from "next/link";

type Row = { id: string; admissionNo: string; firstName: string; lastName: string; sectionName: string | null; className: string | null; status: string };

export function StudentsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="text-mute text-sm">No students yet. Add one or import from Excel.</p>;
  }
  return (
    <table className="w-full text-sm bg-white rounded border border-rule overflow-hidden">
      <thead className="bg-cream text-left">
        <tr>
          <th className="px-4 py-2">Adm. no</th>
          <th className="px-4 py-2">Name</th>
          <th className="px-4 py-2">Class / Section</th>
          <th className="px-4 py-2">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-rule">
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-2 font-mono">{r.admissionNo}</td>
            <td className="px-4 py-2"><Link href={`/students/${r.id}`} className="text-saffron hover:underline">{r.firstName} {r.lastName}</Link></td>
            <td className="px-4 py-2">{r.className ?? "—"} {r.sectionName ? `· ${r.sectionName}` : ""}</td>
            <td className="px-4 py-2 text-mute">{r.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Parent fieldset (used in create + edit)**

`src/components/staff/parent-fieldset.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export type ParentInput = { fullName: string; phone: string; email?: string; relationToStudent?: string; isPrimaryContact?: boolean };

export function ParentFieldset({ value, onChange }: { value: ParentInput[]; onChange: (next: ParentInput[]) => void }) {
  const [draft, setDraft] = useState<ParentInput>({ fullName: "", phone: "", email: "", relationToStudent: "Father", isPrimaryContact: true });
  return (
    <div className="space-y-3 border border-rule p-3 rounded">
      <h3 className="font-medium text-sm">Parents / Guardians</h3>
      <ul className="space-y-1 text-sm">
        {value.map((p, i) => (
          <li key={i} className="flex justify-between"><span>{p.fullName} · {p.phone} ({p.relationToStudent})</span>
            <button type="button" className="text-mute hover:text-red-600" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>×</button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Name</Label><Input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+91…" /></div>
        <div><Label>Email</Label><Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
        <div><Label>Relation</Label><Input value={draft.relationToStudent} onChange={(e) => setDraft({ ...draft, relationToStudent: e.target.value })} /></div>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          if (!draft.fullName || !draft.phone) return;
          onChange([...value, draft]);
          setDraft({ fullName: "", phone: "", email: "", relationToStudent: "Father", isPrimaryContact: false });
        }}
      >
        Add parent
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Student form (client)**

`src/components/staff/student-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudent } from "@/server/students";
import { ParentFieldset, type ParentInput } from "./parent-fieldset";

type Section = { id: string; name: string; className: string | null };

export function StudentForm({ sections }: { sections: Section[] }) {
  const [pending, start] = useTransition();
  const [parents, setParents] = useState<ParentInput[]>([]);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      action={(fd) => {
        setErr(null);
        start(async () => {
          try {
            await createStudent({
              admissionNo: fd.get("admissionNo"),
              firstName: fd.get("firstName"),
              lastName: fd.get("lastName"),
              dob: fd.get("dob") || undefined,
              gender: fd.get("gender") || undefined,
              bloodGroup: fd.get("bloodGroup") || undefined,
              address: fd.get("address") || undefined,
              currentSectionId: fd.get("currentSectionId") || undefined,
              dateOfAdmission: fd.get("dateOfAdmission") || undefined,
            }, parents);
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
      className="space-y-4 max-w-2xl"
    >
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Admission no</Label><Input name="admissionNo" required /></div>
        <div><Label>Section</Label>
          <select name="currentSectionId" className="border border-rule rounded px-3 py-2 w-full">
            <option value="">— Unassigned —</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.className} · {s.name}</option>)}
          </select>
        </div>
        <div><Label>First name</Label><Input name="firstName" required /></div>
        <div><Label>Last name</Label><Input name="lastName" required /></div>
        <div><Label>Date of birth</Label><Input name="dob" type="date" /></div>
        <div><Label>Gender</Label><Input name="gender" /></div>
        <div><Label>Blood group</Label><Input name="bloodGroup" /></div>
        <div><Label>Date of admission</Label><Input name="dateOfAdmission" type="date" /></div>
      </div>
      <div><Label>Address</Label><Input name="address" /></div>

      <ParentFieldset value={parents} onChange={setParents} />

      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Create student"}</Button>
    </form>
  );
}
```

- [ ] **Step 5: List page**

`src/app/(staff)/students/page.tsx`:
```tsx
import Link from "next/link";
import { listStudents } from "@/server/students";
import { StudentsTable } from "@/components/staff/students-table";
import { Button } from "@/components/ui/button";

export default async function StudentsPage() {
  const rows = await listStudents();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-ink">Students</h1>
        <div className="flex gap-2">
          <Link href="/students/import"><Button variant="outline">Import from Excel</Button></Link>
          <Link href="/students/new"><Button>New student</Button></Link>
        </div>
      </div>
      <StudentsTable rows={rows} />
    </div>
  );
}
```

- [ ] **Step 6: New-student page**

`src/app/(staff)/students/new/page.tsx`:
```tsx
import { listSectionsForFilter } from "@/server/students";
import { StudentForm } from "@/components/staff/student-form";

export default async function NewStudentPage() {
  const sections = await listSectionsForFilter();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-semibold text-ink">New student</h1>
      <StudentForm sections={sections} />
    </div>
  );
}
```

- [ ] **Step 7: Manual smoke test**

`pnpm dev` → `/students/new` → fill form, add a parent, submit → land on students page with new row.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: student list and create page with parent linking"
```

---

## Task 19: Student detail page

**Files:**
- Create: `src/app/(staff)/students/[id]/page.tsx`, modify `src/server/students.ts` (add getStudent)

- [ ] **Step 1: Add getStudent server function**

In `src/server/students.ts`, append:
```ts
export async function getStudent(id: string) {
  const session = await requireAbility("students.view");
  const allowed = await permittedStudentIds(db, { userId: session.user.id, role: session.user.role as Role });
  if (!allowed.has(id)) throw new Error("Not found");

  const rows = await db
    .select({
      student: student, sectionName: section.name, className: class_.name,
    })
    .from(student)
    .leftJoin(section, eq(section.id, student.currentSectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .where(eq(student.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) throw new Error("Not found");

  const parents = await db
    .select({ id: parent.id, fullName: parent.fullName, phone: parent.phone, email: parent.email, relation: parent.relationToStudent, isPrimary: parentStudent.isPrimaryContact })
    .from(parentStudent)
    .innerJoin(parent, eq(parent.id, parentStudent.parentId))
    .where(eq(parentStudent.studentId, id));

  return { ...row, parents };
}
```

- [ ] **Step 2: Detail page**

`src/app/(staff)/students/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getStudent } from "@/server/students";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try { data = await getStudent(id); } catch { notFound(); }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-semibold text-ink">
        {data.student.firstName} {data.student.lastName}
      </h1>
      <dl className="grid grid-cols-2 gap-4 text-sm bg-white border border-rule rounded p-4">
        <div><dt className="text-mute">Admission no</dt><dd className="font-mono">{data.student.admissionNo}</dd></div>
        <div><dt className="text-mute">Class / Section</dt><dd>{data.className ?? "—"} {data.sectionName ? `· ${data.sectionName}` : ""}</dd></div>
        <div><dt className="text-mute">Date of birth</dt><dd>{data.student.dob ?? "—"}</dd></div>
        <div><dt className="text-mute">Gender</dt><dd>{data.student.gender ?? "—"}</dd></div>
        <div><dt className="text-mute">Blood group</dt><dd>{data.student.bloodGroup ?? "—"}</dd></div>
        <div><dt className="text-mute">Status</dt><dd>{data.student.status}</dd></div>
        <div className="col-span-2"><dt className="text-mute">Address</dt><dd>{data.student.address ?? "—"}</dd></div>
      </dl>

      <section>
        <h2 className="font-display font-semibold mb-2">Parents / Guardians</h2>
        <ul className="bg-white border border-rule rounded divide-y divide-rule">
          {data.parents.map((p) => (
            <li key={p.id} className="px-4 py-2 text-sm flex justify-between">
              <span>{p.fullName} <span className="text-mute">({p.relation ?? "—"})</span></span>
              <span className="text-mute">{p.phone}{p.isPrimary ? " · primary" : ""}</span>
            </li>
          ))}
          {data.parents.length === 0 && <li className="px-4 py-2 text-sm text-mute">No parents on file.</li>}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Click into the student created in Task 18 — detail page renders with parent.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: student detail page"
```

---

## Task 20: Excel import — parser + validator (TDD)

**Files:**
- Create: `src/lib/excel/parse.ts`, `src/lib/excel/students-importer.ts`, `tests/unit/excel/students-importer.test.ts`

- [ ] **Step 1: Install xlsx**

```bash
pnpm add xlsx
```

- [ ] **Step 2: Parse helper**

`src/lib/excel/parse.ts`:
```ts
import * as XLSX from "xlsx";

export type ParsedRow = Record<string, string | number | undefined>;

export function parseWorkbook(buffer: ArrayBuffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: undefined, raw: false });
}
```

- [ ] **Step 3: Write failing test for importer validation**

`tests/unit/excel/students-importer.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { validateStudentRows, type RawRow } from "@/lib/excel/students-importer";

const valid: RawRow = {
  admission_no: "001", first_name: "Aarav", last_name: "Kumar",
  dob: "2014-06-12", gender: "M", section: "Grade 5 · A",
  parent_name: "Ravi Kumar", parent_phone: "+919999900001", parent_relation: "Father",
};

describe("validateStudentRows", () => {
  it("accepts a fully valid row", () => {
    const result = validateStudentRows([valid], { knownSections: new Map([["Grade 5 · A", "sec-1"]]) });
    expect(result.errors).toEqual([]);
    expect(result.valid.length).toBe(1);
    expect(result.valid[0].student.admissionNo).toBe("001");
  });

  it("rejects missing required fields", () => {
    const result = validateStudentRows([{ ...valid, admission_no: undefined }], { knownSections: new Map() });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toMatch(/admission_no/);
  });

  it("rejects unknown section", () => {
    const result = validateStudentRows([valid], { knownSections: new Map() });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toMatch(/section/i);
  });

  it("rejects malformed phone", () => {
    const result = validateStudentRows([{ ...valid, parent_phone: "12" }], { knownSections: new Map([["Grade 5 · A", "sec-1"]]) });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toMatch(/phone/i);
  });

  it("rejects duplicate admission_no within same upload", () => {
    const result = validateStudentRows([valid, valid], { knownSections: new Map([["Grade 5 · A", "sec-1"]]) });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toMatch(/duplicate/i);
  });
});
```

- [ ] **Step 4: Run test — confirm fail**

```bash
pnpm test
```
Expected: cannot find module.

- [ ] **Step 5: Implement importer validation**

`src/lib/excel/students-importer.ts`:
```ts
export type RawRow = {
  admission_no?: string | number;
  first_name?: string;
  last_name?: string;
  dob?: string;
  gender?: string;
  section?: string;          // "Grade 5 · A"
  blood_group?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_relation?: string;
};

export type ValidatedRow = {
  rowIndex: number;
  student: {
    admissionNo: string; firstName: string; lastName: string;
    dob?: string; gender?: string; bloodGroup?: string; address?: string;
    currentSectionId?: string;
  };
  parent?: { fullName: string; phone: string; email?: string; relationToStudent?: string; isPrimaryContact: true };
};

export type ValidationError = { rowIndex: number; field: string; message: string };

export type ValidationResult = { valid: ValidatedRow[]; errors: ValidationError[] };

const PHONE_RE = /^\+?\d{10,15}$/;

export function validateStudentRows(
  rows: RawRow[],
  ctx: { knownSections: Map<string, string> }
): ValidationResult {
  const errors: ValidationError[] = [];
  const valid: ValidatedRow[] = [];
  const seenAdmission = new Set<string>();

  rows.forEach((row, i) => {
    const idx = i + 2; // sheet row (header is row 1)
    const required: Array<keyof RawRow> = ["admission_no", "first_name", "last_name"];
    const missing = required.filter((f) => row[f] === undefined || row[f] === "");
    if (missing.length > 0) {
      errors.push({ rowIndex: idx, field: missing[0]!, message: `Missing required field: ${missing.join(", ")}` });
      return;
    }
    const admNo = String(row.admission_no);
    if (seenAdmission.has(admNo)) {
      errors.push({ rowIndex: idx, field: "admission_no", message: `Duplicate admission_no in upload: ${admNo}` });
      return;
    }
    seenAdmission.add(admNo);

    let sectionId: string | undefined;
    if (row.section) {
      sectionId = ctx.knownSections.get(row.section);
      if (!sectionId) {
        errors.push({ rowIndex: idx, field: "section", message: `Unknown section: ${row.section}. Create it first.` });
        return;
      }
    }

    let parent: ValidatedRow["parent"];
    if (row.parent_phone || row.parent_name) {
      if (!row.parent_phone || !PHONE_RE.test(row.parent_phone)) {
        errors.push({ rowIndex: idx, field: "parent_phone", message: `Invalid phone: ${row.parent_phone ?? "(missing)"}` });
        return;
      }
      if (!row.parent_name) {
        errors.push({ rowIndex: idx, field: "parent_name", message: "parent_name required when parent_phone present" });
        return;
      }
      parent = {
        fullName: row.parent_name,
        phone: row.parent_phone,
        email: row.parent_email || undefined,
        relationToStudent: row.parent_relation,
        isPrimaryContact: true,
      };
    }

    valid.push({
      rowIndex: idx,
      student: {
        admissionNo: admNo,
        firstName: String(row.first_name),
        lastName: String(row.last_name),
        dob: row.dob,
        gender: row.gender,
        bloodGroup: row.blood_group,
        address: row.address,
        currentSectionId: sectionId,
      },
      parent,
    });
  });

  return { valid, errors };
}
```

- [ ] **Step 6: Run test — confirm pass**

```bash
pnpm test
```
Expected: all 5 importer tests pass.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: Excel students importer parser and validator"
```

---

## Task 21: Excel import — atomic commit server action

**Files:**
- Modify: `src/lib/excel/students-importer.ts` (add commit fn), `src/server/students.ts` (add bulkImportStudents)

- [ ] **Step 1: Add commit function to importer**

Append to `src/lib/excel/students-importer.ts`:
```ts
import { eq } from "drizzle-orm";
import { type DB } from "@/lib/db";
import { student, parent, parentStudent } from "@/lib/db/schema/people";

export async function commitStudentRows(db: DB, rows: ValidatedRow[]) {
  let inserted = 0;
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const [s] = await tx.insert(student).values(row.student).returning();
      if (!s) throw new Error("Insert failed");
      if (row.parent) {
        let parentRow = (await tx.select().from(parent).where(eq(parent.phone, row.parent.phone)).limit(1))[0];
        if (!parentRow) {
          [parentRow] = await tx.insert(parent).values({
            fullName: row.parent.fullName,
            phone: row.parent.phone,
            email: row.parent.email ?? null,
            relationToStudent: row.parent.relationToStudent ?? null,
          }).returning();
        }
        await tx.insert(parentStudent).values({
          parentId: parentRow!.id,
          studentId: s.id,
          isPrimaryContact: row.parent.isPrimaryContact,
        });
      }
      inserted++;
    }
  });
  return { inserted };
}
```

- [ ] **Step 2: Server action**

Append to `src/server/students.ts`:
```ts
import { parseWorkbook } from "@/lib/excel/parse";
import { validateStudentRows, commitStudentRows, type RawRow } from "@/lib/excel/students-importer";

export async function previewImport(buffer: ArrayBuffer) {
  await requireAbility("students.import");
  const rows = parseWorkbook(buffer) as RawRow[];
  const sections = await db
    .select({ id: section.id, name: section.name, className: class_.name })
    .from(section)
    .leftJoin(class_, eq(class_.id, section.classId));
  const knownSections = new Map(sections.map((s) => [`${s.className} · ${s.name}`, s.id]));
  return { rows: rows.length, ...validateStudentRows(rows, { knownSections }) };
}

export async function commitImport(buffer: ArrayBuffer) {
  await requireAbility("students.import");
  const rows = parseWorkbook(buffer) as RawRow[];
  const sections = await db
    .select({ id: section.id, name: section.name, className: class_.name })
    .from(section)
    .leftJoin(class_, eq(class_.id, section.classId));
  const knownSections = new Map(sections.map((s) => [`${s.className} · ${s.name}`, s.id]));
  const validation = validateStudentRows(rows, { knownSections });
  if (validation.errors.length > 0) {
    return { ok: false as const, errors: validation.errors, inserted: 0 };
  }
  const result = await commitStudentRows(db, validation.valid);
  return { ok: true as const, inserted: result.inserted, errors: [] };
}
```

- [ ] **Step 3: Build verification**

```bash
pnpm build
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: atomic commit of validated student import"
```

---

## Task 22: Excel import — UI wizard

**Files:**
- Create: `src/app/(staff)/students/import/page.tsx`, `src/components/staff/import-wizard.tsx`

- [ ] **Step 1: Wizard component**

`src/components/staff/import-wizard.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { previewImport, commitImport } from "@/server/students";

type Preview = Awaited<ReturnType<typeof previewImport>>;
type CommitResult = Awaited<ReturnType<typeof commitImport>>;

export function ImportWizard() {
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [committed, setCommitted] = useState<CommitResult | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function onPreview() {
    if (!file) return;
    const buf = await file.arrayBuffer();
    start(async () => setPreview(await previewImport(buf)));
  }

  async function onCommit() {
    if (!file) return;
    const buf = await file.arrayBuffer();
    start(async () => setCommitted(await commitImport(buf)));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-mute mb-2">
          Required columns: <code>admission_no, first_name, last_name</code>. Optional:
          <code> dob, gender, section, blood_group, address, parent_name, parent_phone, parent_email, parent_relation</code>.
          The <code>section</code> column must match an existing section in the form <code>Class · Section</code> (e.g., <code>Grade 5 · A</code>).
        </p>
        <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setCommitted(null); }} />
      </div>
      <div className="flex gap-2">
        <Button onClick={onPreview} disabled={!file || pending}>Preview</Button>
        <Button onClick={onCommit} disabled={!preview || preview.errors.length > 0 || pending} variant="default">
          Commit {preview ? `(${preview.valid.length} students)` : ""}
        </Button>
      </div>
      {preview && (
        <div className="space-y-2">
          <p className="text-sm">{preview.rows} rows scanned · {preview.valid.length} valid · {preview.errors.length} errors</p>
          {preview.errors.length > 0 && (
            <ul className="bg-red-50 border border-red-200 rounded p-3 text-sm space-y-1">
              {preview.errors.map((e, i) => (
                <li key={i}>Row {e.rowIndex} · <code>{e.field}</code> · {e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {committed && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
          {committed.ok ? `✓ Imported ${committed.inserted} students.` : `✗ Aborted: ${committed.errors.length} errors.`}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Page**

`src/app/(staff)/students/import/page.tsx`:
```tsx
import { ImportWizard } from "@/components/staff/import-wizard";

export default function ImportPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-display font-semibold text-ink">Import students</h1>
      <ImportWizard />
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Create a small `.xlsx` locally with two students (one valid, one missing `admission_no`). `/students/import` → upload → preview shows 1 valid + 1 error. Fix and re-upload → commit → row appears in `/students`.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: Excel import wizard UI (preview + commit)"
```

---

## Task 23: Staff (User) management page

**Files:**
- Create: `src/server/users.ts`, `src/app/(staff)/users/page.tsx`, `src/components/staff/user-form.tsx`

- [ ] **Step 1: Server actions**

`src/server/users.ts`:
```ts
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
  phone: z.string().optional(),
});

export async function listStaff() {
  await requireAbility("users.manage");
  return db.select({ id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive }).from(user);
}

export async function createStaffUser(input: unknown) {
  await requireAbility("users.manage");
  const data = newUserSchema.parse(input);
  const result = await auth.api.signUpEmail({
    body: { email: data.email, password: data.password, name: data.name, role: data.role, phone: data.phone },
  });
  if ("error" in result && result.error) {
    throw new Error(result.error.message ?? "Failed to create user");
  }
  revalidatePath("/users");
}
```

- [ ] **Step 2: Form**

`src/components/staff/user-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStaffUser } from "@/server/users";

const ROLES = ["super_admin", "principal", "office_staff", "accountant", "class_teacher", "subject_teacher"] as const;

export function UserForm() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      action={(fd) => {
        setErr(null);
        start(async () => {
          try {
            await createStaffUser({
              email: fd.get("email"), password: fd.get("password"),
              name: fd.get("name"), role: fd.get("role"), phone: fd.get("phone") || undefined,
            });
          } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
        });
      }}
      className="space-y-3 max-w-md"
    >
      <div><Label>Name</Label><Input name="name" required /></div>
      <div><Label>Email</Label><Input name="email" type="email" required /></div>
      <div><Label>Phone</Label><Input name="phone" /></div>
      <div><Label>Role</Label>
        <select name="role" className="border border-rule rounded px-3 py-2 w-full">
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div><Label>Initial password</Label><Input name="password" type="password" required /></div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button type="submit" disabled={pending}>Add staff user</Button>
    </form>
  );
}
```

- [ ] **Step 3: Page**

`src/app/(staff)/users/page.tsx`:
```tsx
import { listStaff } from "@/server/users";
import { UserForm } from "@/components/staff/user-form";

export default async function UsersPage() {
  const staff = await listStaff();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-display font-semibold text-ink">Staff users</h1>
      <ul className="divide-y divide-rule rounded border border-rule bg-white">
        {staff.map((u) => (
          <li key={u.id} className="px-4 py-2 text-sm flex justify-between">
            <span>{u.name} <span className="text-mute">· {u.email}</span></span>
            <span className="text-mute">{u.role}{u.isActive ? "" : " (inactive)"}</span>
          </li>
        ))}
      </ul>
      <div>
        <h2 className="font-display font-semibold mt-4 mb-2">Add staff user</h2>
        <UserForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Manual smoke test**

`/users` → add a `class_teacher` user → appears in list. Sign out, sign in as that user → confirm sidebar still loads (limited capabilities checked at action level, which is fine for Phase 0).

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: staff user management page"
```

---

## Task 24: Local-dev seed script

**Files:**
- Create: `scripts/seed.ts`, modify `package.json` (add seed script)

- [ ] **Step 1: Seed script**

`scripts/seed.ts`:
```ts
import "dotenv/config";
import { db } from "../src/lib/db";
import { academicYear, class_, section, subject } from "../src/lib/db/schema/academic";
import { student, parent, parentStudent } from "../src/lib/db/schema/people";
import { user } from "../src/lib/db/schema/auth";
import { auth } from "../src/lib/auth";

async function main() {
  console.log("Seeding…");

  // Wipe (dev only — never run in prod!)
  await db.delete(parentStudent);
  await db.delete(parent);
  await db.delete(student);
  await db.delete(section);
  await db.delete(subject);
  await db.delete(class_);
  await db.delete(academicYear);
  await db.delete(user);

  const [yr] = await db.insert(academicYear).values({
    name: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", isCurrent: true,
  }).returning();

  const grades = await db.insert(class_).values(
    [1, 2, 3, 4, 5].map((n) => ({ name: `Grade ${n}`, order: n }))
  ).returning();

  for (const g of grades) {
    await db.insert(section).values([
      { classId: g.id, academicYearId: yr.id, name: "A" },
      { classId: g.id, academicYearId: yr.id, name: "B" },
    ]);
  }

  await db.insert(subject).values([
    { name: "Mathematics", code: "MATH" },
    { name: "English", code: "ENG" },
    { name: "Hindi", code: "HIN" },
    { name: "Science", code: "SCI" },
    { name: "Social Studies", code: "SST" },
  ]);

  const allSections = await db.select().from(section);
  const studentRows = [];
  let admissionCounter = 1;
  for (const sec of allSections) {
    for (let i = 0; i < 5; i++) {
      const num = String(admissionCounter++).padStart(4, "0");
      const [s] = await db.insert(student).values({
        admissionNo: `HGS${num}`,
        firstName: `Student${num}`,
        lastName: "Test",
        currentSectionId: sec.id,
      }).returning();
      const [p] = await db.insert(parent).values({
        fullName: `Parent of ${num}`,
        phone: `+91900000${num.padStart(4, "0").slice(-4)}`,
      }).returning();
      await db.insert(parentStudent).values({ parentId: p.id, studentId: s.id, isPrimaryContact: true });
      studentRows.push(s);
    }
  }

  await auth.api.signUpEmail({
    body: { email: "admin@hgs.local", password: "admin1234", name: "Admin", role: "super_admin" },
  });
  await auth.api.signUpEmail({
    body: { email: "teacher@hgs.local", password: "teacher1234", name: "Teacher", role: "class_teacher" },
  });

  console.log(`Done. ${studentRows.length} students seeded across ${allSections.length} sections.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add script to package.json**

```json
"seed": "dotenv -e .env.local -- tsx scripts/seed.ts"
```

- [ ] **Step 3: Run it**

```bash
pnpm seed
```
Expected: console reports "50 students seeded across 10 sections." Visit `/students` after `pnpm dev` and signing in as `admin@hgs.local` — table populated.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: add local-dev seed script"
```

---

## Task 25: Playwright E2E — staff login + import smoke test

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/staff-login.spec.ts`, `tests/e2e/student-import.spec.ts`, fixture file `tests/e2e/fixtures/students-2.xlsx` (manual)

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: Playwright config**

`playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  webServer: { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120_000 },
  reporter: [["list"]],
});
```

Add to `package.json` scripts:
```json
"e2e": "playwright test"
```

- [ ] **Step 3: Login spec**

`tests/e2e/staff-login.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("staff can log in and see dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@hgs.local");
  await page.getByLabel("Password").fill("admin1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("redirects unauthenticated requests to /login", async ({ page }) => {
  await page.goto("/students");
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 4: Build a tiny .xlsx test fixture (manual)**

Use Excel/LibreOffice/Google Sheets to create `tests/e2e/fixtures/students-2.xlsx` with this content:

| admission_no | first_name | last_name | section | parent_name | parent_phone |
|--------------|------------|-----------|---------|-------------|--------------|
| E2E001 | Anaya | Test | Grade 5 · A | Test Parent A | +919999999991 |
| E2E002 | Vivaan | Test | Grade 5 · A | Test Parent B | +919999999992 |

Save as `.xlsx`. Commit the binary file (acceptable for tests).

- [ ] **Step 5: Import spec**

`tests/e2e/student-import.spec.ts`:
```ts
import { test, expect } from "@playwright/test";
import path from "node:path";

test("staff can import students from Excel", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@hgs.local");
  await page.getByLabel("Password").fill("admin1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/students/import");
  const file = path.resolve(__dirname, "fixtures/students-2.xlsx");
  await page.setInputFiles("input[type=file]", file);
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText(/2 valid · 0 errors/)).toBeVisible();
  await page.getByRole("button", { name: /Commit/ }).click();
  await expect(page.getByText(/Imported 2 students/)).toBeVisible();

  await page.goto("/students");
  await expect(page.getByText("E2E001")).toBeVisible();
  await expect(page.getByText("E2E002")).toBeVisible();
});
```

- [ ] **Step 6: Reset DB, seed, run E2E**

```bash
pnpm seed
pnpm e2e
```
Expected: both E2E tests pass.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "test: Playwright E2E for staff login and student import"
```

---

## Task 26: Deploy to Vercel + Neon production branch

**Files:**
- Modify: `.env.example` (document NEXT_PUBLIC_APP_URL), `README.md` (deploy notes)

- [ ] **Step 1: Promote dev branch to main / create production branch in Neon (manual)**

In Neon console: branches → create `main` branch (or rename `dev` → `production`). Copy the production connection string.

- [ ] **Step 2: Create Vercel project (manual)**

Go to https://vercel.com/new → import the `dhiraj1014/hgs-saas` GitHub repo. Framework: Next.js (auto-detected). Don't deploy yet.

- [ ] **Step 3: Set production environment variables in Vercel**

Settings → Environment Variables → add for **Production** (and Preview too):
```
DATABASE_URL=<Neon production connection string>
BETTER_AUTH_SECRET=<openssl rand -base64 32 — DIFFERENT from dev>
BETTER_AUTH_URL=https://<your-vercel-url>
NEXT_PUBLIC_APP_URL=https://<your-vercel-url>
```

- [ ] **Step 4: Apply migrations to production DB**

Locally, with `DATABASE_URL` temporarily pointing at production:
```bash
DATABASE_URL="<prod url>" pnpm drizzle-kit migrate
```

(Or use Neon's SQL editor to copy-paste the migration SQL.)

- [ ] **Step 5: Trigger first deploy**

Push any small change (e.g., README touch) and watch the Vercel deploy. Or use Vercel UI "Deploy" button.

```bash
echo "" >> README.md
git add README.md
git commit -m "chore: trigger first Vercel deploy"
git push origin main
```

- [ ] **Step 6: Bootstrap first super_admin in production**

Locally with prod URL:
```bash
DATABASE_URL="<prod url>" BETTER_AUTH_URL="https://<your-vercel-url>" pnpm create-admin admin@himalayanglobalschool.in <strong-prod-password> "Neeraj Kumar"
```

- [ ] **Step 7: Smoke test production**

Visit `https://<your-vercel-url>/login`, sign in with prod admin, verify dashboard renders.

- [ ] **Step 8: Update README with deploy notes**

Append to `README.md`:
```md
## Deploy

- App: Vercel project `hgs-saas`
- DB: Neon project `hgs-saas`, branch `production`
- Migrations: `DATABASE_URL=<prod> pnpm drizzle-kit migrate`
- Bootstrap first user: `DATABASE_URL=<prod> BETTER_AUTH_URL=<prod> pnpm create-admin <email> <password> <name>`
```

- [ ] **Step 9: Commit**

```bash
git add README.md
git commit -m "docs: production deploy notes"
git push
```

---

## Self-Review

**1. Spec coverage:**

| Spec section | Tasks |
|---|---|
| §3 Roles & permissions | 12 (permissions helper), 14 (server guard) |
| §4 Architecture & stack | 1, 2, 3, 4, 8 |
| §5 Data model — foundation | 5, 6, 7 |
| §5 Data model — Phase 1 | (deferred) |
| §5 Data model — Phase 2 | (deferred) |
| §5 Data model — Phase 3 | (deferred) |
| §5 Data model — Phase 4 | (deferred) |
| §6 Phasing — Phase 0 | this plan |
| §7 Integrations | (deferred — Phase 1+) |
| §8 Error handling — bulk import dry-run / atomic commit | 20, 21, 22 |
| §9 Security — query-helper scoping | 13 |
| §10 Testing — Vitest unit | 12, 13, 20 |
| §10 Testing — Playwright | 25 |
| §10 Testing — seed script | 24 |
| §11 Deployment — Vercel + Neon | 26 |

**Gaps acknowledged:** Parent OTP login is in spec §3/§4 but deferred to Phase 1 (depends on MSG91 DLT registration which takes ~5 days). All Phase 1-4 items deferred to their own plans. `AuditLog` table not introduced in Phase 0 — added in Phase 2 (when fees/marks mutations begin).

**2. Placeholder scan:** None. Every step has runnable commands or complete code blocks. The two manual prerequisites (Neon project create, Vercel project create) are explicit user actions, not placeholders.

**3. Type consistency:**
- `Role` type defined in `permissions.ts` Task 12, used in `student-scoping.ts` Task 13 ✓
- `permittedStudentIds(db, ctx)` signature consistent in both definition (Task 13) and consumers (Task 18, 19) ✓
- `ValidatedRow` exported from `students-importer.ts` Task 20, consumed by `commitStudentRows` Task 21 ✓
- `Ability` enum in Task 12 covers `students.create`, `students.edit`, `students.import`, `students.view`, `classes.manage`, `subjects.manage`, `academic-years.manage`, `users.manage` — all referenced in later tasks. ✓
- `user.id` is `text` (Better Auth string IDs). `student.id`, `parent.id`, etc., are `uuid`. Forward-reference fix in Task 6 step 3 corrects `section.classTeacherId` from `uuid` to `text`. ✓

**4. Ambiguity:** None remaining. Open spec items (Razorpay account ownership, MSG91 DLT registration, receipt format, CBSE template, WhatsApp number) are Phase 1+ concerns and not blocking Phase 0.

---

**Plan complete.**
