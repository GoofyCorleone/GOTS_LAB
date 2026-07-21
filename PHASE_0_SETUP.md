# Phase 0: Setup & Configuration

**Status**: ✅ Complete - Code scaffold and database migrations ready

This guide covers the final setup steps before you can run Phase 1 (authentication).

## What's Been Done (Automatically)

- ✅ Next.js 15 scaffold with TypeScript + Tailwind v4
- ✅ Design system cloned from institutional site (oklch colors, Inter font)
- ✅ 8 Supabase migrations (complete schema with RLS, triggers, availability logic)
- ✅ GitHub Actions workflow for automatic deploy to Pages
- ✅ Placeholder pages (home, login, register, profile)
- ✅ Excel seed script for inventory parsing

## What You Need to Do

### 1. Install Dependencies

```bash
npm install
```

### 2. Connect to Supabase Project

Create `.env.local` (copy from `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://vsaloslsautitcsqonlq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_PHt7cHQaxDVXDz6TG8513w_h7TinizO
```

For seeding (local only), add to `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Get this from: Supabase Dashboard → Settings → API → Service Role Key (keep it secret, never commit!)

### 3. Apply Database Migrations

In Supabase CLI:

```bash
npm install -g supabase
supabase login
supabase link --project-ref vsaloslsautitcsqonlq
supabase migration up
```

Or directly in the Supabase SQL editor: copy-paste each migration file from `supabase/migrations/` in order.

### 4. Seed Inventory from Excel (One-Time)

```bash
npx tsx scripts/seed-inventory.ts
```

This reads `Inventario equipo Rafael.xlsx` and populates the `locations` and `inventory_items` tables.

### 5. Test Local Development

```bash
npm run dev
```

Visit http://localhost:3000

You should see the placeholder landing page.

### 6. Verify Deployment

Push to main:

```bash
git push origin main
```

GitHub Actions will build and deploy to: `https://GoofyCorleone.github.io/GOTS_LAB/`

## Next Steps → Phase 1

Phase 1 focuses on authentication and layout:

- Implement login/register with Supabase Auth (email/password)
- Frontend validation for `@correo.uis.edu.co` domain
- Header/footer with navigation
- Home page with context text and 3 action buttons
- Profile page skeleton

Estimated: 2-3 hours of development.

## Troubleshooting

**Problem**: "NEXT_PUBLIC_SUPABASE_URL is not defined"
- **Solution**: Check `.env.local` exists and has both variables

**Problem**: "Error: SUPABASE_SERVICE_ROLE_KEY not found" when seeding
- **Solution**: Add the service role key to `.env.local` (local only, never commit!)

**Problem**: Migrations fail
- **Solution**: Ensure you're logged in (`supabase login`) and linked to the right project

**Problem**: GitHub Actions deploy fails
- **Solution**: Verify GitHub repo secrets are set (see earlier instructions)

## Key Files

| Path | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with theme setup |
| `src/app/globals.css` | Tailwind config + oklch tokens |
| `src/lib/supabase/client.ts` | Supabase browser client (singleton) |
| `supabase/migrations/` | Database schema (8 files) |
| `scripts/seed-inventory.ts` | Excel parser + seed script |
| `.github/workflows/deploy.yml` | CI/CD for GitHub Pages |

---

**Questions?** Check CLAUDE.md for architecture overview, or see the plan in `.claude/plans/`.
