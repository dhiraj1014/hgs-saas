# Phase 1: Attendance + Parent Communication

**Date:** 2026-05-01
**Phase:** 1 of 5
**Depends on:** Phase 0 (foundation, auth, role model, students CRUD) — shipped
**Umbrella spec:** [HGS SaaS design](./2026-05-01-hgs-school-saas-design.md)

## Goal

Class teachers can mark daily attendance for their assigned section. Parents who are marked absent or late get an automatic SMS. Principal/super-admin can broadcast announcements (school-wide, class-wide, section-wide, or to specific parents). Parents can log in to a portal via phone-OTP and see their children's attendance + messages history.

Single deployable phase that produces working software end-to-end. No queues, no background workers, no cron — synchronous request handling throughout.

## Scope

**In scope:**
- Daily attendance marking (one record per student per day; status: Present / Absent / Late)
- Class-teacher-scoped attendance UI
- School-staff (principal/super-admin) view of attendance across all sections
- Real SMS-based OTP for parent login (MSG91)
- Stubbed (log-only) SMS for attendance alerts and announcements — flip to real via env var when ready
- Parent portal: phone-OTP login, child switcher, attendance view per child, announcements feed, notifications history
- Announcement composer with audience targeting (school / class / section / specific parents)
- `notification_log` table records every send attempt (real or stubbed) with status + error

**Out of scope (deferred to later phases):**
- Multiple attendance sessions per day (morning/afternoon/per-period)
- WhatsApp delivery (deferred to Phase 1.5 if cost analysis warrants it)
- Two-way messaging (parent reply → staff inbox)
- Attendance reports / analytics / monthly summaries
- Leave applications / approval workflow
- Push notifications (web/native)
- Templated message editing UI (templates are code-defined for Phase 1)
- Read receipts on announcements

## Approach

**Approach 1: Synchronous, no queue infrastructure** (chosen).

Attendance writes commit first (single transaction). Notification fan-out happens *after* commit, sequentially, in the same request. Each notifier call is wrapped in try/catch and logs its outcome to `notification_log`. A failed SMS never rolls back attendance.

Rationale:
- School scale: ~30 students per section × 1 SMS per absence = trivial fan-out
- No new infra (no Redis, no Vercel cron, no background worker) — keeps Phase 1 deployable on the existing Vercel + Neon stack
- If we later need higher throughput (or scheduled bulk sends), we add a queue then — YAGNI for now

**Rejected alternatives:**
- *Queue + worker (BullMQ/SQS):* over-engineered for school scale, adds Redis as a dependency
- *Inline-in-transaction notifications:* a notifier hiccup would roll back the attendance write — unacceptable, the data is the source of truth

## Data model deltas (from Phase 0)

### New tables

```sql
-- One row per student per day. Composite unique on (student_id, date).
CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  section_id      UUID NOT NULL REFERENCES section(id),
  date            DATE NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('present','absent','late')),
  marked_by       TEXT NOT NULL,         -- user.id of the teacher who marked
  marked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT,
  UNIQUE (student_id, date)
);
CREATE INDEX idx_attendance_section_date ON attendance(section_id, date);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);

-- Sent (or attempted) messages. Audit trail + delivery status.
CREATE TABLE notification_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel              TEXT NOT NULL CHECK (channel IN ('sms','whatsapp')),
  template_key         TEXT NOT NULL,         -- 'parent_otp' | 'attendance_absent' | 'attendance_late' | 'announcement'
  recipient_phone      TEXT NOT NULL,
  recipient_parent_id  UUID REFERENCES parent(id) ON DELETE SET NULL,
  status               TEXT NOT NULL CHECK (status IN ('stub_sent','sent','failed','skipped_no_phone','rate_limited')),
  provider             TEXT,                  -- 'stub' | 'msg91'
  provider_message_id  TEXT,                  -- MSG91's request ID, when applicable
  error_message        TEXT,
  related_entity_type  TEXT,                  -- 'attendance' | 'announcement' | 'parent_otp'
  related_entity_id    UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_log_phone_created ON notification_log(recipient_phone, created_at DESC);
CREATE INDEX idx_notif_log_related ON notification_log(related_entity_type, related_entity_id);

-- Announcements. Audience resolved at send time, fan-out logged in notification_log.
CREATE TABLE announcement (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by         TEXT NOT NULL,         -- user.id
  audience_type   TEXT NOT NULL CHECK (audience_type IN ('school','class','section','students')),
  audience_ref    JSONB,                 -- { classId } | { sectionId } | { studentIds: [...] } | null for school
  body            TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_announcement_sent_at ON announcement(sent_at DESC);

-- Sliding-window rate limiting for parent OTP requests.
CREATE TABLE otp_attempt (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT NOT NULL,
  attempted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_otp_attempt_phone_time ON otp_attempt(phone, attempted_at DESC);
```

### Modifications to existing tables

```sql
-- Rename existing user.phone → phone_number to match Better Auth phoneNumber plugin's default column name.
ALTER TABLE "user" RENAME COLUMN phone TO phone_number;
ALTER TABLE "user" ADD CONSTRAINT user_phone_number_unique UNIQUE (phone_number);
ALTER TABLE "user" ADD COLUMN phone_number_verified BOOLEAN NOT NULL DEFAULT FALSE;
```

**Linkage between `user` (parent role) and `parent` (contact record):** by phone, not by foreign key. A `user` with `role='parent'` is found by `user.phone_number`. The set of `parent` rows owned by that user is `parent` rows where `parent.phone = user.phone_number`. (Note: `parent.phone` is uniquely indexed so each user's phone matches at most one parent row — but using a JOIN-friendly query lets us extend cleanly if that constraint is ever relaxed.)

`parent.phone` (existing) remains the source of truth for "where do we send messages." `user.phone_number` (renamed from `phone`, also used by Better Auth) is the auth credential. Same value at first-login time. Phase 0 staff users already have `phone` populated where set — the rename preserves their data.

**Code update required:** `src/lib/student-scoping.ts:39` currently selects `user.phone`; update to `user.phoneNumber` after schema rename.

## Auth additions

- Better Auth **phoneNumber plugin** enabled with custom `sendOTP(phone, code)` callback that delegates to our `notifier.sendParentOtp(phone, code)`
- New role: `parent` (added to existing role enum)
- New helper: `requireParent()` — like `requireSession()` but throws if `role !== 'parent'`
- Parent OTP rate limit: max 3 requests per phone per hour, max 10 per phone per day. Tracked in a new lightweight `otp_attempt(phone, attempted_at)` table with a sliding window check on each request.
- On first successful OTP verify for a phone:
  - Create `user` row with `role='parent'`, `phone_number=<phone>`, `phone_number_verified=true`, no email/password
  - No explicit linkage step — student access is resolved at query time by matching `parent.phone = user.phone_number`
  - If no `parent` row exists for this phone, the user can still log in but sees an empty portal with a "your account isn't linked to any students yet, contact the school office" message
- On subsequent OTP verifies: existing `user` is found by `phone_number`, new session created

## Routing additions

```
/parent-login                   # Phone entry → request OTP
/parent-login/verify            # OTP entry → create session
/(parent)                       # Parent route group, requireParent() in layout
  /dashboard                    # Child switcher + recent attendance + recent announcements
  /attendance                   # Selected child's monthly attendance grid (read-only)
  /announcements                # Filtered feed for the selected child
  /notifications                # SMS log for this parent's phone (so they can verify what we sent)

/(staff)/attendance             # Class teacher: pick section + date → mark grid
/(staff)/attendance/all         # Principal/super-admin: cross-section view by date
/(staff)/announcements          # List of past announcements
/(staff)/announcements/new      # Composer with audience picker
/(staff)/notifications          # Full notification_log table (admin-only)
```

## Components

**New:**
- `<AttendanceGrid>` — table of students with P/A/L radio per row, save button, last-marked timestamp
- `<AttendanceMonthView>` — read-only calendar grid for parent portal
- `<AnnouncementComposer>` — body textarea + `<AudiencePicker>` + send confirmation
- `<AudiencePicker>` — radio for school/class/section/students; conditional dropdown(s)
- `<NotificationLogTable>` — paginated, filterable by phone/template/status/date
- `<ChildSwitcher>` — dropdown in parent portal header listing all linked students
- `<AttendanceCard>` — summary card (today's status / month's count) for parent dashboard
- `<AnnouncementsFeed>` — chronological list of announcements visible to a parent

## Server modules

**New:** `src/server/`
- `attendance.ts` — `markAttendance({ sectionId, date, entries })`, `getSectionAttendance(sectionId, date)`, `getStudentAttendance(studentId, monthStart, monthEnd)`, `getAssignedSections()` for current teacher
- `announcements.ts` — `sendAnnouncement({ audienceType, audienceRef, body })`, `getAnnouncements(filter)`, `getAnnouncementsForStudent(studentId)`
- `notifications.ts` — `getNotificationLog(filter)` (admin), `getNotificationsForPhone(phone)` (parent)
- `parent.ts` — `requestParentOtp(phone)`, `getLinkedStudents(parentUserId)`, helpers used by `/(parent)` pages

## Notifier abstraction

**The seam:** `src/lib/notifier/`

```ts
// src/lib/notifier/index.ts
export interface Notifier {
  sendParentOtp(phone: string, code: string): Promise<NotificationResult>;
  sendAttendanceAlert(phone: string, data: AttendanceAlertData): Promise<NotificationResult>;
  sendAnnouncement(phone: string, body: string): Promise<NotificationResult>;
}

export interface NotificationResult {
  status: 'sent' | 'stub_sent' | 'failed' | 'skipped_no_phone' | 'rate_limited';
  providerMessageId?: string;
  errorMessage?: string;
}

export interface AttendanceAlertData {
  studentName: string;
  date: string;       // formatted DD-MMM-YYYY
  status: 'absent' | 'late';
  sectionName: string;
}
```

**Implementations:**
- `src/lib/notifier/stub.ts` — writes a `notification_log` row with `status='stub_sent'`, `provider='stub'`. No network call. **Dev-only convenience: the stub mirrors the OTP code into `notification_log.provider_message_id` so E2E tests and `pnpm drizzle-kit studio` can read it.** Real MSG91 puts an opaque `request_id` there instead, and the OTP plaintext is never stored locally.
- `src/lib/notifier/msg91.ts` — POST to `https://control.msg91.com/api/v5/flow/` for templated messages. 10-second timeout, single retry on 5xx, writes log row with `status='sent'` or `'failed'`.

**Per-channel routing:** `src/lib/notifier/index.ts` exports a singleton `notifier` whose methods individually inspect env flags:

```ts
export const notifier: Notifier = {
  async sendParentOtp(phone, code) {
    return process.env.MSG91_ENABLED_FOR_OTP === 'true'
      ? msg91Notifier.sendParentOtp(phone, code)
      : stubNotifier.sendParentOtp(phone, code);
  },
  async sendAttendanceAlert(phone, data) { ... same pattern ... },
  async sendAnnouncement(phone, body) { ... same pattern ... },
};
```

This lets us turn on real SMS for OTP only (Phase 1 default) and flip the others on later without code changes.

**Production safety check:** `src/lib/notifier/index.ts` runs at module load:
```ts
if (process.env.NODE_ENV === 'production' && !process.env.MSG91_AUTH_KEY) {
  throw new Error('MSG91_AUTH_KEY must be set in production');
}
```
Prevents an accidental "all stubbed in prod" deployment.

## Permissions

New abilities (added to `src/lib/permissions.ts` grants table):
- `attendance.mark` — class_teacher (scoped to assigned sections), principal, super_admin
- `attendance.view-all` — principal, super_admin, office_staff
- `attendance.view-own-children` — parent
- `announcements.send` — principal, super_admin
- `announcements.send-school-wide` — super_admin only (principal can do class/section/students but not whole-school)
- `announcements.view` — all staff roles, parent (filtered to their children)
- `notifications.view-all` — super_admin, principal
- `notifications.view-own` — parent

**Class-teacher attendance scoping (defense-in-depth):**
1. Middleware: cookie check
2. `requireAbility('attendance.mark')` in the server action
3. Server action additionally verifies the `sectionId` is in the teacher's `teacher_assignment` rows for the current academic year (mirrors how `permittedStudentIds` works for student queries)

**UI visibility rule:** Per established project convention (see CLAUDE.md), nav links and CTAs are only rendered when the user can actually perform the action. The sidebar's filter logic in `nav-sidebar.tsx` is extended for the new abilities.

## Flows

### Attendance marking

1. Class teacher visits `/attendance`
2. Server-side: `getAssignedSections()` returns sections from `teacher_assignment` for current academic year
3. Teacher picks a section + date (defaults to today)
4. `<AttendanceGrid>` renders students from that section, pre-filled from any existing `attendance` rows for that date
5. Teacher toggles statuses, clicks Save
6. Server action `markAttendance({ sectionId, date, entries })`:
   - `requireAbility('attendance.mark')`
   - Verify `sectionId` is in teacher's assigned sections (or role is principal/super_admin)
   - In a single transaction: `INSERT ... ON CONFLICT (student_id, date) DO UPDATE SET status, marked_by, marked_at, notes` for each entry
   - Compute diff: which students transitioned from `present`/null → `absent` or `late`
   - Commit transaction
   - **Post-commit**, sequentially for each newly-absent/late student:
     - Look up primary parent via `parent_student.is_primary_contact = true` → `parent.phone`
     - Call `notifier.sendAttendanceAlert(phone, { studentName, date, status, sectionName })`
     - Each call returns a result; `notification_log` row written by the notifier
   - Return `{ marked, notified, failed, skipped }` to UI
7. UI shows toast: "Marked 32 students. 4 parents notified, 1 failed (see Notifications)."

### Announcement send

1. Principal/super_admin visits `/announcements/new`
2. Composer: textarea + audience picker
3. On send, server action `sendAnnouncement({ audienceType, audienceRef, body })`:
   - `requireAbility('announcements.send')`; if `audienceType === 'school'`, also `requireAbility('announcements.send-school-wide')`
   - Resolve audience to a deduplicated list of parent phones:
     - `school` → all parents
     - `class` → parents of students in any section of that class
     - `section` → parents of students in that section
     - `students` → parents of those specific students
   - Insert `announcement` row with `recipient_count`
   - Post-insert, sequentially for each phone, call `notifier.sendAnnouncement(phone, body)`
4. Same toast pattern as attendance

### Parent OTP login

1. Parent visits `/parent-login`
2. Enters 10-digit phone (we prepend +91)
3. Server action `requestParentOtp(phone)`:
   - Check rate limit (3/hour, 10/day per phone) via `otp_attempt` table; on hit, return generic success but log `status='rate_limited'`
   - Whether or not a `parent` row exists for this phone: call Better Auth's `phoneNumber.sendOTP(phone)` which generates a 6-digit code and invokes our `sendOTP` callback → `notifier.sendParentOtp(phone, code)`
   - Always return generic success ("If this number is registered, you'll get a code") to avoid leaking which phones are registered
4. Parent enters code on `/parent-login/verify`
5. Better Auth verifies. On success:
   - If `user` with this `phone_number` exists, create session
   - If not, create `user(role='parent', phone_number, phone_number_verified=true)` (no explicit parent linkage — done at query time)
6. Redirect to `/(parent)/dashboard`

### Parent portal browsing

- All RSCs in `/(parent)/*` use `permittedStudentIds(db, ctx)` which, for a `parent` role, returns student IDs from `parent_student` joined to `parent` where `parent.phone = ctx.user.phoneNumber`
- Child switcher persists selected child via cookie
- Attendance, announcements, notifications pages all scope queries through `permittedStudentIds` or `recipient_phone = ctx.user.phoneNumber`

## Error handling

| Failure | Behavior |
|---|---|
| MSG91 5xx | Single retry after 1s; if still failing, log `status='failed'`, `error_message` set; never bubble |
| MSG91 4xx (bad template, invalid phone) | Log `status='failed'`, `error_message` with response body; never retry |
| MSG91 timeout (>10s) | Same as 5xx |
| Parent has no phone | Log `status='skipped_no_phone'`; UI count includes it as "skipped" |
| Parent OTP rate limit hit | Generic success to user, log `status='rate_limited'` |
| Concurrent attendance edits same (student, date) | `ON CONFLICT DO UPDATE` — last write wins. Acceptable: there's only ever one class teacher per section. |
| Class teacher attempts unassigned section | 403 from server action; logged for audit |
| Notifier missing in production | Module-load throw on `MSG91_AUTH_KEY` missing in `NODE_ENV=production` |
| Re-marking same status (no transition) | No notification fires; only status *transitions to* absent/late trigger SMS |

## Testing

### Vitest (PGlite)

- `permissions.test.ts` — extend with truth-table for all new abilities × all roles
- `student-scoping.test.ts` — extend parent role coverage (Phase 0 already has basics):
  - parent user whose phone matches a parent row with 2 linked students → sees both
  - parent user whose phone matches a parent row with 0 linked students → returns []
  - parent user with no matching parent row → returns []
  - regression: rename from `user.phone` to `user.phoneNumber` does not break existing parent-scoping behavior
- `attendance.test.ts` (new):
  - Mark fresh attendance, verify rows inserted, no notifications for present students
  - Mark with one absent → one `notification_log` row with `status='stub_sent'`
  - Re-mark same day with status change Present → Absent → notification fires
  - Re-mark same day with same status → no duplicate notification
  - Class teacher cannot mark for unassigned section → 403
- `announcements.test.ts` (new):
  - Audience resolution dedup (parent with 2 kids in scope receives one message)
  - School-wide gating — principal blocked, super_admin allowed
- `notifier/stub.test.ts` (new) — returns success, writes log row with `status='stub_sent'`
- `notifier/msg91.test.ts` (new) — mock global `fetch`:
  - Verify request URL, headers, body shape
  - Parse success response → `status='sent'`, `providerMessageId` populated
  - Parse 4xx response → `status='failed'`, `errorMessage` populated
  - 5xx triggers retry, second attempt succeeds → `status='sent'`
  - 5xx twice → `status='failed'`
  - Timeout → `status='failed'`
- `notifier/index.test.ts` (new) — env flag routing:
  - `MSG91_ENABLED_FOR_OTP=true` routes OTP through MSG91 implementation
  - `MSG91_ENABLED_FOR_OTP=false` (default) routes through stub
  - Same for `_FOR_ATTENDANCE`, `_FOR_ANNOUNCEMENTS`
  - `NODE_ENV=production` + missing `MSG91_AUTH_KEY` throws on import

### Playwright (E2E)

All E2E runs locally against the **stub** notifier (no real SMS sends in CI). The OTP code is fetched from the most recent `notification_log` row in test setup.

- Parent OTP happy path: enter phone → submit → fetch code from log → enter → land on dashboard → see linked child
- Parent OTP for unregistered phone: enter unknown phone → generic success → log row exists with `status='stub_sent'` to that phone, but `/parent-login/verify` with any code creates a `user` with no linked students → dashboard shows empty state
- Class teacher: log in → `/attendance` → pick section → mark 2 absent + 1 late → save → toast shows "3 notified" → log out
- Super admin: log in → `/notifications` → see 3 fresh `stub_sent` rows
- Principal: send section-targeted announcement → log shows fan-out per parent in that section, deduplicated

### Manual smoke test (not automated)

- Real MSG91 OTP send to your own phone, verify code arrives
- One round-trip: real phone → real OTP → land in portal → see test student

## Env vars (additions)

Local `.env.local` (dev keeps everything stubbed by default):
```
# MSG91 (optional in dev — stub used unless these are set)
MSG91_AUTH_KEY=
MSG91_SENDER_ID=HGSPAT
MSG91_TEMPLATE_ID_PARENT_OTP=69f4a31b1275cb72470d9e02
MSG91_TEMPLATE_ID_ATTENDANCE_ALERT=
MSG91_TEMPLATE_ID_ANNOUNCEMENT=
MSG91_ENABLED_FOR_OTP=false
MSG91_ENABLED_FOR_ATTENDANCE=false
MSG91_ENABLED_FOR_ANNOUNCEMENTS=false
```

Vercel Production environment:
```
MSG91_AUTH_KEY=<from MSG91 dashboard, set as Sensitive>
MSG91_SENDER_ID=HGSPAT     # update post-DLT
MSG91_TEMPLATE_ID_PARENT_OTP=69f4a31b1275cb72470d9e02
MSG91_TEMPLATE_ID_ATTENDANCE_ALERT=    # blank until template registered
MSG91_TEMPLATE_ID_ANNOUNCEMENT=        # blank until template registered
MSG91_ENABLED_FOR_OTP=true
MSG91_ENABLED_FOR_ATTENDANCE=false
MSG91_ENABLED_FOR_ANNOUNCEMENTS=false
```

## Deployment

1. Apply migrations to Neon `production` branch
2. Set 7 new MSG91 env vars in Vercel (Production only)
3. Push to `main` → Vercel auto-deploys
4. Smoke test: real phone OTP login, verify message arrives within 10s
5. No DLT yet — sandbox sender (default MSG91 test sender) used until DLT registration completes

## Open questions / deferred decisions

- **DLT registration timing:** deferred until just before real-parent rollout (option (b) per brainstorm). Will need school's PAN at that point.
- **WhatsApp:** deferred to Phase 1.5 if cost analysis warrants it. Notifier interface is shaped to accept a second channel without changes.
- **Attendance/announcement template content:** drafts will be added during implementation; not in this spec.
- **Multiple attendance sessions per day:** explicitly out of scope. If needed later, add `session` column to `attendance` and update unique constraint.

## Phasing within Phase 1

Suggested implementation slicing for the plan that follows this spec:

1. **Schema + migrations** (attendance, notification_log, announcement, user/parent column adds)
2. **Permissions extension** (new abilities, sidebar nav filter, `requireParent()`)
3. **Notifier abstraction** (interface, stub impl, env-routing index)
4. **Attendance marking** (server action, grid UI, post-commit notification fan-out via stub)
5. **Announcement send** (server action, composer UI, audience resolution, fan-out via stub)
6. **MSG91 implementation + parent OTP wiring** (msg91.ts, Better Auth phoneNumber plugin, rate limit)
7. **Parent portal pages** (route group, child switcher, attendance/announcements/notifications views)
8. **E2E tests** (full suite against stub)
9. **Production deployment + smoke test** (env vars, real OTP to test phone)

Each slice ends in a green test suite + commit. Slice 6 is the only one that requires the real MSG91 auth key; everything else can be built and tested without it.
