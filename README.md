# HGS SaaS

Internal school management web app for **Himalayan Global School** (Byapur, Patna). Single-tenant — built only for HGS, not a multi-tenant product.

Authoritative docs:
- [Phase 0 spec](docs/superpowers/specs/2026-05-01-hgs-school-saas-design.md) — full data model (~20 tables across phases), integrations, security model, phasing
- [Phase 0 plan](docs/superpowers/plans/2026-05-01-phase-0-foundation.md) — task-by-task implementation
- [`CLAUDE.md`](CLAUDE.md) — project guide for AI coding agents (architecture, conventions, quirks)

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind v4 + shadcn/ui · Drizzle ORM · Postgres on Neon · Better Auth (email + password) · Vitest + PGlite for unit tests · Playwright for E2E. Hosted on Vercel.

## Local development

```bash
pnpm install
cp .env.example .env.local       # fill in DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL
pnpm seed                         # wipes + seeds dev DB; creates admin@hgs.local / admin1234
pnpm dev                          # http://localhost:3000
```

Sign in at `/login` with `admin@hgs.local` / `admin1234`.

### Common commands

```bash
pnpm dev                          # dev server
pnpm build                        # production build
pnpm test                         # Vitest (unit + integration via PGlite)
pnpm e2e                          # Playwright E2E (auto-spawns dev server)
pnpm seed                         # wipe + reseed dev DB
pnpm create-admin <email> <password> [name]   # bootstrap a super_admin
pnpm drizzle-kit generate         # generate SQL from schema diff
pnpm drizzle-kit migrate          # apply migrations to DATABASE_URL
pnpm tsx scripts/wipe-all-data.mts --yes-wipe    # destructive: truncate all data tables
pnpm tsx scripts/count-rows.mts                  # read-only row count sanity check
```

## Production

- **App:** Vercel project [`hgs-saas`](https://vercel.com/dhiraj1014s-projects/hgs-saas) → https://hgs-saas.vercel.app
- **DB:** Neon project `hgs-saas`, Singapore region (`ap-southeast-1`)
  - **`production` branch** — connected to Vercel
  - **`dev` branch** — used by local `pnpm dev` / `pnpm seed`
- **Repo:** [`dhiraj1014/hgs-saas`](https://github.com/dhiraj1014/hgs-saas) — public, deployed on push to `main`

### Env vars (Vercel → Settings → Environment Variables)

| Name | Notes |
|---|---|
| `DATABASE_URL` | Neon **production** branch pooled connection string |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`, distinct from dev |
| `BETTER_AUTH_URL` | `https://hgs-saas.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | same as `BETTER_AUTH_URL` |

### Apply migrations to production

```powershell
$env:DATABASE_URL = "<production connection string>"
pnpm drizzle-kit migrate
```

### Bootstrap the first super_admin in production

```powershell
$env:DATABASE_URL = "<production connection string>"
$env:BETTER_AUTH_URL = "https://hgs-saas.vercel.app"
$env:BETTER_AUTH_SECRET = "<production secret>"
pnpm create-admin "<email>" "<strong-password>" "Director Name"
```

## Notes & quirks

- **Neon auto-suspend:** Hobby tier scales to zero after ~5 min of inactivity. CLI scripts may hit `ENOTFOUND` while the compute is resuming. Either visit the deployed URL once to warm it up, or in Neon → Settings → Compute extend the auto-suspend timeout.
- **Windows / Node DNS:** scripts in `scripts/` set `dns.setDefaultResultOrder("ipv4first")` because Node prefers IPv6 by default and Neon's IPv6 path is unreachable from some Windows networks.
- **Vercel build env:** `lib/db/index.ts` lazy-initializes the Drizzle client and `lib/auth.ts` skips the `BETTER_AUTH_SECRET` throw during `next build` (`NEXT_PHASE === "phase-production-build"`). Both env vars are still required at runtime — module re-evaluates on the runtime server.
- **Defense-in-depth auth:** middleware does coarse cookie checks; `requireSession` / `requireAuthAbility` enforce role and ability inside server actions and RSCs; `permittedStudentIds` adds a third layer for student-scoped queries. See [`CLAUDE.md`](CLAUDE.md).

## Phasing

Phase 0 (✓ shipped) — foundation, auth, role model, academic data model, students CRUD, Excel bulk import, staff user management.

Upcoming phases (each gets its own brainstorm → spec → plan → implement cycle, see the [umbrella spec](docs/superpowers/specs/2026-05-01-hgs-school-saas-design.md)):

1. Attendance + parent communication (SMS via MSG91, WhatsApp via AiSensy)
2. Fees (Razorpay UPI/cards, receipt PDFs)
3. Admissions (public enquiry form embedded on `hgs-web`)
4. Exams + report cards (CBSE format)

Each phase ships a usable thing on its own.
