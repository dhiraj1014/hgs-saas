# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

`hgs-saas` is the **single-tenant** internal school management web app for Himalayan Global School (HGS), Byapur, Patna. It is **not** a multi-tenant SaaS — there is no tenant model, no subscription billing, no marketing site for the product. A separate static site `hgs-web` handles marketing.

The app serves two distinct audiences from one codebase:
- **Staff** (desktop-first, route group `(staff)`) — heavy data entry, dashboards, bulk operations.
- **Parents** (mobile-first, route group `(parent)`) — read-only access to their own children's data; can pay fees. *Deferred to Phase 1 — not yet built.*

Work is broken into phases. The current branch is **`phase-0`** (foundation: project shell, auth, role model, academic data model, bulk Excel student import, staff user management). Phases 1–4 add attendance/comms, fees (Razorpay), admissions, and exams/report cards.

Authoritative design docs:
- `docs/superpowers/specs/2026-05-01-hgs-school-saas-design.md` — full data model (~20 tables across phases), integrations, security model, phasing.
- `docs/superpowers/plans/2026-05-01-phase-0-foundation.md` — Phase 0 implementation plan (read this for conventions and task breakdown).

## Common commands

Package manager is **pnpm** (lockfile committed). All commands run from repo root.

```bash
pnpm dev                       # Next.js dev server on :3000
pnpm build                     # production build
pnpm lint                      # ESLint (Next + TS rules)

pnpm test                      # Vitest unit/integration (one-shot)
pnpm test:watch                # Vitest watch mode
pnpm vitest run tests/unit/permissions.test.ts   # single test file

pnpm e2e                       # Playwright E2E (auto-spawns dev server)
pnpm playwright test tests/e2e/staff-login.spec.ts   # single E2E spec

pnpm seed                      # wipe + reseed dev DB; creates admin@hgs.local / admin1234
pnpm create-admin <email> <password> [name]   # bootstrap a super_admin

# Drizzle migrations
pnpm drizzle-kit generate      # generate SQL from schema diff
pnpm drizzle-kit migrate       # apply migrations to DATABASE_URL
pnpm drizzle-kit studio        # open Drizzle Studio

# Destructive — requires explicit flag, truncates all data tables (schema preserved)
pnpm tsx scripts/wipe-all-data.mts --yes-wipe
```

`seed` and `create-admin` use `dotenv-cli` to load `.env.local`. `drizzle-kit` reads `.env` via `dotenv/config` in `drizzle.config.ts` — put `DATABASE_URL` in `.env.local` and either symlink or copy to `.env` for migration commands.

## Architecture: defense-in-depth authorization

Authorization is enforced at **two layers**, by design. Treat this as load-bearing — never delete one assuming the other will catch it.

1. **`src/middleware.ts`** — matches staff route prefixes and redirects unauthenticated requests to `/login`. Coarse-grained, cookie-only check via `getSessionCookie` (no DB hit, runs on every request).
2. **`src/server/session.ts`** — `requireSession()` and `requireAbility(ability)` run inside server actions / RSCs. They call `auth.api.getSession` and check role → ability via `src/lib/permissions.ts`. **Every server action and RSC that touches data must call `requireAbility`** (or `requireSession` for read-anywhere endpoints).

For **student-scoped data**, there is a third layer: `src/lib/student-scoping.ts` exposes `permittedStudentIds(db, ctx)`, which returns the set of student IDs a given user is allowed to see based on their role and assignments (e.g., a `class_teacher` only sees students in sections they teach; a `parent` only sees students linked through `parentStudent` for their phone). **All student queries must intersect with this set** — see `src/server/students.ts:listStudents` and `getStudent` for the canonical pattern (`inArray(student.id, [...allowed])` filter or `.has(id)` guard).

A bug in middleware does not leak data because the query layer enforces scoping independently. This pattern extends to every future student-scoped table (attendance, fees, marks).

## Layout & boundaries

```
src/
├── app/                       Next.js App Router
│   ├── (auth)/login           Public login surface
│   ├── (staff)/               Staff console — gated by middleware + StaffLayout RSC redirect
│   └── api/auth/[...all]      Better Auth handler (toNextJsHandler)
├── components/
│   ├── ui/                    shadcn primitives (do not edit by hand; regenerate via shadcn CLI)
│   ├── staff/                 staff-specific forms, tables, sidebar
│   └── shared/                cross-surface
├── lib/                       Pure logic. No Next.js imports. Easy to unit-test with Vitest.
│   ├── auth.ts                Better Auth server config (Drizzle adapter; email+password; custom user fields)
│   ├── auth-client.ts         Better Auth React hooks (signIn, signOut, useSession)
│   ├── db/index.ts            Drizzle client (postgres-js, prepare:false for Neon pooler)
│   ├── db/schema/             Split by domain: enums, auth, academic, people. index.ts re-exports all.
│   ├── permissions.ts         Role × Ability grants table; can(role, ability)
│   ├── student-scoping.ts     permittedStudentIds — the security-critical helper
│   └── excel/                 SheetJS wrapper + students-importer (validation + atomic commit)
├── server/                    "use server" actions/queries. DB-touching. Imports lib/.
└── middleware.ts              Coarse route gate (cookie-only, no DB)
```

**Hard rules:**
- `lib/` never imports from `next/*` or `server/`. This is what lets Vitest run it against PGlite without Next.
- `server/` only imported from RSCs and server actions. Every public function starts with `requireAbility` or `requireSession`.
- `components/` never imports `db` or `auth.ts` directly. Pass data in via props from RSCs.
- Schema files split by domain, each kept small. Re-exported from `src/lib/db/schema/index.ts`.

## Database & migrations

- Postgres on Neon. ORM is **Drizzle**. Schema is the source of truth — generate migrations with `drizzle-kit generate`.
- Domain tables use `uuid().defaultRandom()` PKs. Better Auth tables (`user`, `session`, `account`, `verification`) use `text` PKs (Better Auth generates IDs).
- `user.role` is a Postgres enum (see `schema/enums.ts`). Adding a role requires a migration.
- All timestamps are `timestamp({ withTimezone: true })`.
- The `user` table is extended with `phone`, `role`, `isActive` via Better Auth's `additionalFields` config in `lib/auth.ts`. Keep these in sync with `schema/auth.ts`.

## Testing strategy

- **Vitest + PGlite** (`@electric-sql/pglite`) for unit and integration tests. `tests/helpers/pglite.ts:freshTestDb()` spins up an in-memory Postgres and replays the SQL files in `drizzle/` — so tests run without Neon and the migrations themselves are exercised.
- **Playwright** for E2E. `playwright.config.ts` auto-starts `pnpm dev` and uses the real Neon DB pointed at by `.env.local`. The seed script must have been run so `admin@hgs.local / admin1234` exists. Tests live in `tests/e2e/`.
- TDD discipline (per Phase 0 plan): every business-logic task starts with a failing test. UI shells, config, and styling do not require tests.
- Excel fixtures for E2E are binary `.xlsx` files in `tests/e2e/fixtures/`. Regenerate with `pnpm tsx tests/e2e/fixtures/build-fixtures.mts`.

## Conventions

- **TypeScript strict** with `noUncheckedIndexedAccess` and `noImplicitOverride`. Array access returns `T | undefined` — handle it (the codebase uses non-null assertion `!` deliberately after explicit length/exists checks).
- **Path alias:** `@/*` → `src/*`.
- **Commits:** Conventional Commits (`feat:`, `chore:`, `test:`, `fix:`, `refactor:`). One commit per task.
- **Validation:** Zod schemas at server-action boundaries (see `src/server/students.ts` for the pattern). Excel rows go through `validateStudentRows` before `commitStudentRows`, which uses a single `db.transaction` for atomicity.
- **shadcn/ui** with `radix-nova` style and `neutral` baseColor. Add components via the shadcn CLI; aliases in `components.json`.

## Windows / Neon quirk

`playwright.config.ts` sets `NODE_OPTIONS=--dns-result-order=ipv4first` for the dev server it spawns. This works around a Neon DNS lookup issue on this Windows shell. If you see `ENOTFOUND` against `*.neon.tech` from Node, this is the cause — keep the flag.
