# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GOTS_LAB** is a web application for inventory and experiment tracking in an optical physics laboratory at Universidad Industrial de Santander (UIS). The system allows lab members to:
1. Authenticate with institutional email (`@correo.uis.edu.co`)
2. Navigate and reserve optical equipment from two physical locations (drawers/cabinets)
3. Register experiments with legal accountability for equipment usage
4. Track multi-session experiments and invite lab members to participate
5. Receive notifications and email summaries of experiment status

This repository is an **optional, visually identical annexe** to the main institutional website (https://gotsresearchgroup-beep.github.io/GOTS.github.io/), deployed to GitHub Pages as a static export.

## Technology Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript, Tailwind CSS v4 + shadcn/ui (Radix UI components)
- **Hosting**: GitHub Pages (static export, `output: "export"`, deployed via GitHub Actions)
- **Backend**: Supabase (PostgreSQL + Auth + Storage) — free tier, consumed 100% client-side via `supabase-js`
- **Email**: Resend (free tier) invoked from Supabase Edge Functions
- **Design System**: Cloned 1:1 from the institutional repo — oklch color tokens (primary: neutral grays, accent: gold `oklch(72.74% 0.126 86.91)`), Inter font, Tailwind config

## Architecture Overview

### Database (Supabase PostgreSQL)
Core tables and their purpose:
- `profiles` — Public mirror of `auth.users` (name, email, role), auto-created by trigger on signup
- `locations` — Physical storage (drawers/cabinets), seeded once from Excel
- `inventory_items` — Optical equipment catalog with optional Thorlabs reference, quantity total, image URL, searchable by name/reference
- `experiments` — Experiment metadata (title, owner, dates, status: draft → in_progress → finished)
- `experiment_legal_acceptance` — Immutable audit record (owner signed responsibility waiver, timestamp, IP)
- `experiment_sessions` — Support for multi-session experiments (each session: started_at, ended_at_planned, ended_at_actual)
- `experiment_participants` — Lab members invited or requesting access to an experiment
- `experiment_items` — Inventory reservations per experiment (quantity, individual or shared mode)
- `experiment_item_shares` — Fine-grained sharing of specific items (orthogonal to participant roles)
- `notifications` + `email_log` — Transactional notifications and delivery audit

**Key design patterns**:
- **Real-time availability**: Function `get_inventory_availability()` (`SECURITY DEFINER`) exposes aggregated available quantities without leaking cross-experiment details.
- **Concurrency control**: Trigger `BEFORE INSERT ON experiment_items` with `SELECT ... FOR UPDATE` prevents double-booking races.
- **Email domain restriction**: Trigger `BEFORE INSERT ON auth.users` enforces `@correo.uis.edu.co` domain — cannot be bypassed via direct API calls.
- **Legal immutability**: `experiment_legal_acceptance` has no UPDATE/DELETE RLS policies + additional `REVOKE` at the table level.
- **Row-level security**: Every table has policies that restrict reads/writes based on `auth.uid()` or experiment ownership/participant status.

### Frontend Structure (Next.js App Router, Static Export)

```
src/app/
  layout.tsx, globals.css          — Theme (tokens, fonts) copied from institutional repo
  page.tsx                         — Landing page (context + 3 action buttons)
  login/page.tsx, register/page.tsx — Auth flows with @correo.uis.edu.co validation
  profile/page.tsx                 — User dashboard (history, notifications, access requests)
  experiments/new/page.tsx         — Wizard (6 steps as client state, not separate routes)
  experiments/detail/page.tsx      — ?id=... (continue, reopen inventory, finalize)
  accompany/page.tsx               — Request access to in-progress experiments
  inventory/page.tsx, inventory/item/page.tsx — Browse and search equipment

src/lib/
  supabase/client.ts               — Singleton `createBrowserClient` (anon key)
  supabase/types.ts                — Generated types from `supabase gen types typescript`
  supabase/queries/                — Reusable `supabase-js` calls (profiles, inventory, experiments, etc.)
  auth/domain.ts                   — Regex for email domain validation (UX only)

supabase/
  migrations/0001_*.sql…0008_*.sql — Schema definition (run via CLI: `supabase migrate up`)
  functions/send-email/index.ts    — Deno Edge Function (Resend integration, called by DB webhook)

scripts/seed-inventory.ts          — Parse Excel (respects side-by-side sub-tables), upsert locations/items
```

**Route design note**: Dynamic routes `[id]` break static export (`output: "export"`). All dynamic pages use `?id=...` querystring, read client-side via `useSearchParams()`.

## Development Workflow

### Prerequisites
1. Node.js 18+ and npm/pnpm
2. Supabase account (free tier sufficient); note the project URL and anon key
3. Resend account (free tier: 100 emails/day)
4. GitHub repo secrets configured: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Environment Setup
```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### Common Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Build static export to `./out` |
| `npm run start` | Serve built export locally |
| `npx supabase migration up` | Apply database migrations |
| `npx tsx scripts/seed-inventory.ts` | Parse `Inventario equipo Rafael.xlsx` and seed DB (local only, never in CI) |
| `npx supabase gen types typescript > src/lib/supabase/types.ts` | Regenerate TypeScript types from schema |

## Project Phases & Model Delegation

The implementation is split into 6 phases. For model selection during development:

| Phase | Focus | Recommended Model | Tasks |
|-------|-------|-------------------|-------|
| **Phase 0** | Scaffolding, config, migrations | **Opus 4.8** | Next.js scaffold, Tailwind/shadcn setup, all 8 migrations (schema design, triggers, RLS policies, availability function, domain validation) |
| **Phase 1** | Auth, layout, navigation | **Sonnet** | Login/register components, header/footer, home page, profile skeleton; Opus reviews security (email domain trigger, RLS) |
| **Phase 2** | Inventory | **Sonnet** | Seed script (Excel parsing), location browser, search, item cards, image upload; Opus reviews availability function access |
| **Phase 3** | New experiment flow | **Opus + Sonnet** | Opus: reservation triggers + legal acceptance table/gate; Sonnet: form components + wizard state management |
| **Phase 4** | Continue & history | **Sonnet** | Session management UI, experiment history, re-open inventory; Opus reviews multi-session trigger logic |
| **Phase 5** | Accompany flow | **Opus** | Participant request/notification DB logic; **Sonnet**: UI for search/request/approval |
| **Phase 6** | Deployment & hardening | **Opus** | Security review (RLS bypass checks, domain validation, email gateway), Supabase Edge Function; **Sonnet**: responsive testing, visual polish |

**Decision rule**: Use **Opus 4.8** for database schema, security policies, complex concurrency logic, and before merging sensitive features. Use **Sonnet** for UI components, form handling, scripting, and responsive design.

## Key Constraints & Decisions

1. **GitHub Pages hosting**: Static export only, no server-side rendering, no API routes. All auth/persistence happens in Supabase.
2. **Email domain**: Enforced at DB level (trigger), not just frontend. Cannot be bypassed.
3. **No Thorlabs taxonomy in v1**: Navigation by physical location (drawer/cabinet) + text search only. Category taxonomy deferred to Phase 7+.
4. **Multi-session experiments**: A single experiment can have N sessions across multiple days. Inventory is only freed when the entire experiment ends (`status = 'finished'`).
5. **Shared items vs. participants**: A lab member can be invited as an experiment "participant" (full access) *or* share a single item (fine-grained). These are orthogonal.
6. **Legal acceptance**: Immutable at the database level. Stored once per experiment. Validates before `draft → in_progress` transition.

## Security Checklist (Pre-Merge)

- [ ] All tables have RLS enabled with appropriate `SELECT`/`INSERT`/`UPDATE`/`DELETE` policies
- [ ] `experiment_legal_acceptance` has zero UPDATE/DELETE policies + `REVOKE` statement
- [ ] `get_inventory_availability()` is `SECURITY DEFINER` and only exposes aggregates, never cross-experiment details
- [ ] Email domain trigger (`enforce_uis_email_domain`) tested with out-of-domain email via direct Supabase API call
- [ ] Availability trigger (`BEFORE INSERT/UPDATE ON experiment_items`) tests double-booking prevention
- [ ] Resend API key stored as Supabase Edge Function secret, never in client code
- [ ] Database Webhook to send-email function configured in Supabase dashboard

## References

- Institutional website repo (design system): https://github.com/GOTSResearchGroup-beep/GOTS.github.io
- Supabase docs: https://supabase.com/docs
- Next.js static export: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
- Resend docs: https://resend.com/docs
