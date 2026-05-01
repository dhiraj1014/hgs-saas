# HGS School SaaS — Design Spec

**Date:** 2026-05-01
**Status:** Draft, pending user review
**Project:** Internal school management system for Himalayan Global School (HGS), Byapur, Patna

---

## 1. Purpose & non-goals

A single-tenant web application used internally by HGS staff and by HGS parents. It replaces the paper / Excel / WhatsApp workflows the school currently uses for student records, attendance, fees, admissions, and exams.

**Non-goals (explicit):**

- Not a multi-tenant SaaS. No other school will use this. No tenant model, no plans, no subscription billing for the product itself, no marketing site for the product.
- Not a replacement for `hgs-web` (the existing static marketing site). The SaaS lives at a separate subdomain and links back.
- No native mobile app in v1. Parents use a mobile-responsive web portal.
- No timetable generator, library, transport/GPS, HR/payroll, or biometric attendance in v1. These are post-v1 if the school asks.
- No bilingual (Hindi) UI in v1. English-first; Hindi targeted for v1.1 once the core ships.

## 2. Audiences

Two distinct user groups served from one codebase:

- **Staff** — desktop-first, used during the workday from a school computer or laptop. Heavy data entry, dashboards, bulk operations.
- **Parents** — mobile-first, occasional use on a personal phone. Read-only for most things, plus the ability to pay fees.

## 3. Roles & permissions

| Role | Description | Surface |
|---|---|---|
| `super_admin` | Director + 1 IT contact only. Can do anything. | Staff |
| `principal` | Read everything; lock exam marks; approve admissions; view fee dashboards. | Staff |
| `office_staff` | Manage students, admissions, fees, send announcements. Cannot edit marks. | Staff |
| `accountant` | Fees only — view, reconcile, refund. | Staff |
| `class_teacher` | Their assigned section's attendance + announcements to that section's parents. | Staff |
| `subject_teacher` | Marks entry for the subjects/classes they teach. | Staff |
| `parent` | Read-only access to their own children's data. Can pay fees. | Parent |

Permissions enforced in two places, by design:

1. **Middleware** — gates route access by role.
2. **Query helper layer** — every query against student-scoped data joins through a permitted-students view derived from the current user's role and assignments. A parent's query for `students` always filters through `ParentStudent` for their `parent_id`. A bug in middleware does not leak data.

## 4. Architecture & stack

**Stack:**

- **Framework:** Next.js 15 (App Router, RSC), TypeScript
- **Styling:** Tailwind CSS + shadcn/ui, themed to match `hgs-web` (saffron `#D67A1F`, cream `#FBF7F0`, ink `#111418`; Bricolage Grotesque + Inter; Tiro Devanagari Hindi for Sanskrit)
- **DB:** Postgres on Neon (DB branch per PR for previews)
- **ORM:** Drizzle
- **Auth:** Better Auth — staff via email + password, parents via phone OTP
- **Payments:** Razorpay (UPI / cards / netbanking)
- **SMS:** MSG91 (DLT-approved transactional templates — TRAI requirement)
- **WhatsApp:** AiSensy (WhatsApp Business API templates)
- **Email:** Resend (receipts, password resets only — low volume)
- **PDF:** `@react-pdf/renderer` (server-side)
- **Excel:** SheetJS / `xlsx`
- **File storage:** UploadThing or Supabase Storage (signed URLs)
- **Background jobs:** `pg-boss` (Postgres-backed queue — no Redis required)
- **Hosting:** Vercel (app) + Neon (DB)
- **Monitoring:** Sentry (errors), Axiom (logs), PostHog (product analytics)

**Routing layout:**

```
app/
├── (staff)/             desktop-first
│   ├── dashboard
│   ├── students
│   ├── attendance
│   ├── fees
│   ├── admissions
│   └── exams
├── (parent)/            mobile-first
│   ├── child/[id]
│   ├── fees
│   ├── attendance
│   ├── results
│   └── notices
└── api/
    ├── razorpay/webhook
    ├── msg91/dlr
    └── ...
```

Middleware on every request: resolve user → check role permits this route group → redirect mismatches to their home.

**Domain (proposed):** `app.himalayanglobalschool.in`. The marketing site `hgs-web` links to `/login`. To be confirmed before Phase 0.

**Parent ↔ student is M:N.** Siblings share parents; divorced households can have two parents on different phones. Both must be supported without contortions.

## 5. Data model

Roughly 20 tables, grouped by phase. Drizzle schema. Postgres timestamps with timezone. All tables have `id` (cuid), `created_at`, `updated_at` unless noted.

### Foundation (Phase 0)

- `AcademicYear` — `name` (e.g., "2026-27"), `start_date`, `end_date`, `is_current` (only one row true at a time)
- `Class` — `name` (e.g., "Grade 5"), `order` (sortable)
- `Section` — `class_id`, `name` (A/B/C), `academic_year_id`, `class_teacher_id` → `User`, `capacity`
- `Subject` — `name`, `code`
- `ClassSubject` — `class_id`, `subject_id`, `academic_year_id`
- `User` (staff) — `email` UNIQUE, `name`, `phone`, `role`, `is_active`
- `TeacherAssignment` — `user_id`, `section_id`, `academic_year_id`, `role_in_section` (`class_teacher` | `subject_teacher`), `subject_id?`
- `Student` — `admission_no` UNIQUE, `first_name`, `last_name`, `dob`, `gender`, `blood_group`, `photo_url`, `address`, `current_section_id`, `status` (`active` | `left` | `graduated`), `date_of_admission`
- `Parent` — `full_name`, `phone` UNIQUE (OTP login), `email`, `occupation`, `relation_to_student`
- `ParentStudent` — `parent_id`, `student_id`, `is_primary_contact` (M:N)

### Phase 1 (Attendance + comms)

- `AttendanceRecord` — `student_id`, `date`, `section_id`, `status` (`present` | `absent` | `late` | `leave`), `marked_by_user_id`, `marked_at`. `UNIQUE(student_id, date)`.
- `Announcement` — `title`, `body`, `audience` (`school` | `class` | `section` | `parent_list`), `audience_target_id`, `channels` (array: `sms`, `whatsapp`, `in_app`), `sent_by_user_id`, `sent_at`
- `NotificationLog` — `channel`, `recipient`, `template_id`, `payload_json`, `status` (`queued` | `sent` | `delivered` | `failed`), `external_id`, `sent_at`, `delivered_at`, `related_entity_type`, `related_entity_id`. Every outbound SMS/WhatsApp/email writes a row.

### Phase 2 (Fees)

- `FeeHead` — `name` (Tuition, Transport, Lab, …), `is_recurring`, `frequency` (`monthly` | `term` | `annual`)
- `FeeStructure` — `class_id`, `academic_year_id`, `fee_head_id`, `amount`, `due_day_of_month?`
- `FeeInvoice` — `student_id`, `academic_year_id`, `period` (e.g., `2026-04`), `total_amount`, `amount_paid`, `status` (`unpaid` | `partial` | `paid` | `overdue`), `due_date`, `generated_at`
- `FeeInvoiceItem` — `fee_invoice_id`, `fee_head_id`, `amount`
- `Payment` — `fee_invoice_id`, `amount`, `method` (`upi` | `card` | `cash` | `netbanking` | `cheque`), `razorpay_payment_id?` UNIQUE, `razorpay_order_id?`, `receipt_no` UNIQUE (sequential, generated via Postgres sequence), `receipt_pdf_url`, `paid_at`, `recorded_by_user_id?`, `status` (`pending` | `success` | `failed` | `refunded`)

### Phase 3 (Admissions)

- `AdmissionApplication` — `applicant_first_name`, `applicant_last_name`, `applying_for_class_id`, `parent_name`, `parent_phone`, `parent_email`, `status` (`enquiry` | `form_submitted` | `docs_uploaded` | `interview_scheduled` | `admitted` | `rejected` | `withdrawn`), `enquiry_source`, `notes`
- `AdmissionDocument` — `application_id`, `kind`, `file_url`
- `AdmissionEvent` — `application_id`, `from_status`, `to_status`, `actor_user_id?`, `notes`, `at`

### Phase 4 (Exams)

- `Exam` — `name` (e.g., "Half Yearly 2026-27"), `academic_year_id`, `start_date`, `end_date`, `is_marks_locked` (boolean — principal action)
- `ExamSubject` — `exam_id`, `class_id`, `subject_id`, `max_marks`, `passing_marks`, `exam_date`
- `Mark` — `exam_id`, `student_id`, `subject_id`, `marks_obtained`, `remarks`, `entered_by_user_id`, `entered_at`. `UNIQUE(exam_id, student_id, subject_id)`.
- `ReportCard` — `exam_id`, `student_id`, `generated_at`, `pdf_url`, `published_to_parent` (boolean)

### Cross-cutting

- `AuditLog` — `user_id`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `at`, `ip`. Mandatory on every fee, marks, and admissions mutation.

## 6. Phasing

All five modules ship eventually. They land in this order, and each phase is usable on its own.

**Phase 0 — Foundation (~2 weeks)**
Project shell (themed to match `hgs-web`). Auth (staff + parent). Roles. Core entities. **Bulk Excel import** for the existing student roster (non-negotiable — the office cannot hand-type the existing roll). Class / Section / Academic Year management. User (staff) management.

**Phase 1 — Attendance + parent communication (~2-3 weeks)**
Daily attendance per section (mobile-friendly grid; tap P/A/L; one round-trip save). Auto-SMS to parent on absence. School-wide and section-scoped announcements (SMS + WhatsApp). Parent portal v1: child summary card, attendance history, announcements feed. **First module that gives parents a reason to log in.**

**Phase 2 — Fees (~3-4 weeks)**
Fee heads + per-class structure. Bulk invoice generation (cron + on-demand). Razorpay UPI/card payment with webhook. Auto-receipt PDF (sequential receipt number). Office collection dashboard (today / MTD / outstanding). Parent: dues + pay button. Reminder SMS at +7 / +14 days overdue. **Highest-stakes module — money in, money out, audit trail required.**

**Phase 3 — Admissions (~2-3 weeks)**
Public enquiry form embedded on `hgs-web/admissions.html` via iframe (preserves the no-toolchain rule of `hgs-web`). Pipeline kanban for office: enquiry → form → docs → interview → admitted/rejected. Document upload/review. On admission, `Student` record auto-created and welcome SMS sent.

**Phase 4 — Exams + report cards (~3-4 weeks)**
Exam definition wizard. Marks entry grid (subject teacher; one section at a time). Principal lock-marks action. CBSE-format report card PDF generation. Parent sees results card after publish.

**Total estimate:** ~12–16 weeks of focused work for one developer.

## 7. Integrations

- **Razorpay** — Standard Checkout. Server creates Order → client opens Checkout → server webhook (`payment.captured`) updates `Payment`. HMAC signature verified on every webhook. Idempotent on `razorpay_payment_id` UNIQUE constraint. Refunds via Razorpay API.
- **MSG91** — Transactional flow templates pre-approved with DLT (mandatory for Indian SMS as of TRAI rules). Each notification logs to `NotificationLog`. Delivery receipts via webhook update `NotificationLog.status` and `delivered_at`.
- **AiSensy** — Template-based WhatsApp Business API. Same logging pattern. Used for richer messages where SMS feels too terse (announcements, "report card published").
- **Resend** — Receipts, password resets. Lowest volume.

All external calls wrapped with retry (exponential backoff, 3 attempts) + dead-letter logging. Background jobs for slow stuff (bulk invoice gen, report card PDFs, broadcast SMS) via `pg-boss`.

## 8. Error handling & resilience

- **Payment double-processing** is the only thing that absolutely must not happen. Idempotency via `razorpay_payment_id` UNIQUE; webhook handler reads-then-inserts inside a transaction.
- **Bulk Excel import** — dry-run preview, atomic transaction commit, line-level error report on rollback.
- **Rate limits:** parent OTP send 3/hr/phone; admission form 5/hr/IP.
- **File uploads** via signed URLs.
- **Background job failures** retried with exp backoff; final failure goes to a dead-letter table the office can see.

## 9. Security

- Per-parent data scoping enforced at the query-helper layer (defense in depth — not just middleware).
- HTTPS everywhere (Vercel default); CSP and standard security headers in `next.config.js`.
- Razorpay test keys in dev; live keys gated to production deployment only.
- PII at rest relies on Postgres-at-rest encryption (Neon default) for v1. Column-level encryption for phone/email/dob is a v2 consideration.
- `AuditLog` writes on every fee, marks, and admissions mutation.

## 10. Testing

- **Vitest** for unit tests:
  - Fee calculation logic
  - Mark aggregation / report card formula
  - Role permission helpers
  - Parent-student scoping (the most security-sensitive helper)
- **Playwright** for the three load-bearing user journeys:
  1. Staff marks attendance → parent receives SMS
  2. Parent pays fees → receipt PDF generated and emailed
  3. Admission enquiry → office advances pipeline → student record auto-created
- **Razorpay test mode** for payment integration tests.
- **Seed script** creates a fake school (5 classes, 50 students, 3 teachers, 1 parent). Used for local dev and Playwright.

## 11. Deployment

- Vercel preview deployment per PR.
- Neon DB branch per PR (so previews have isolated DB state).
- Production: single Vercel project + Neon production branch.
- Secrets in Vercel env vars.
- Daily DB backup via Neon PITR (built-in).
- Domain: `app.himalayanglobalschool.in`.

## 12. Open questions

The following are open and worth resolving before Phase 0 starts; none block writing the implementation plan.

- Confirm Razorpay account is owned by HGS (not personal). KYC needs to be in the school's name for proper accounting.
- Confirm MSG91 DLT registration done in HGS's name (Director Neeraj Kumar as authorized signatory). DLT sender ID approval takes ~5 business days.
- Decide receipt number format (e.g., `HGS/2026-27/00001`) before Phase 2.
- Confirm CBSE report card format HGS currently uses (some boards have school-specific variations).
- Confirm WhatsApp Business number for AiSensy — typically a dedicated number, not the school's existing WhatsApp.
