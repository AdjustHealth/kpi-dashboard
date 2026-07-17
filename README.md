# Adjust Health OS

Internal operating system for Adjust Health: weekly KPI input, clinic
dashboards, and director/senior-physio/admin meeting pages — one entry point
(Weekly Input) so numbers aren't re-keyed into every meeting.

Stack: Next.js (App Router, TypeScript) + Supabase (Postgres + Auth) + Tailwind
CSS, deployable to Vercel.

## Project structure

- `lib/schema.ts` — single source of truth for clinic-wide weekly KPI fields
  (ports the original `EXPORT_SCHEMA.js`, plus fields discovered in the
  Adjust Health senior-physio meeting spreadsheet).
- `lib/providerSchema.ts` — per-provider weekly field definitions
  (performance KPIs, compliance checklist, systems/KPA review).
- `lib/calc.ts` / `lib/providerCalc.ts` — derived values (rolling averages,
  the bonus-tier / turnover-pacing engine). The provider calc engine is unit
  tested against real numbers transcribed from the spreadsheet
  (`tests/providerCalc.test.ts`).
- `supabase/migrations/0001_init.sql` — full schema, RLS policies, and a
  storage bucket for uploaded Nookal reports. Seeds the two current senior
  physios (Sam Johnson, Marcio dos Santos) with their real specialty KPIs.
- `app/(app)/*` — the app itself, one folder per sidebar item (Dashboard,
  Weekly Input, Clinic ▸ Revenue/Clinic Health/Specialty Services,
  Providers, Admin, Senior Physio, Targets, Settings).

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project**

   - Go to [supabase.com](https://supabase.com), create a free project.
   - In the SQL Editor, paste and run the full contents of
     `supabase/migrations/0001_init.sql`.
   - In **Authentication → Providers**, make sure **Email** is enabled and
     turn **off** "Allow new users to sign up" (this app is director-invite
     only).
   - In **Authentication → Users**, manually invite each director's email —
     this sends them a signup/reset link so they can set a password.

3. **Configure environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in the three values from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; keep this secret)

4. **Run it**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) — you'll land on
   `/login`. Sign in with a director account you invited in step 2.

## Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this from the
   repo) and import it into a new Vercel project.
2. In the Vercel project's **Environment Variables**, add the same three
   variables from step 3 above.
3. Deploy. Every push to the connected branch redeploys automatically.

## Testing

```bash
npm run test    # vitest — schema, calc, and provider bonus-engine tests
npm run lint    # eslint
npx tsc --noEmit
npm run build   # next build
```

## What's deliberately not built yet

This is the framework pass — see the ChatGPT-drafted spec this was built
from, which explicitly asked to "build the framework first, then
progressively add calculations, automations, APIs, and reporting."
Specifically still open:

- **Nookal report parsing.** The Weekly Input page lets you upload the six
  Nookal reports (Activity, Business Performance, Occupancy, Clients &
  Cases, Cancellations, Aged Debtors) and stores them against the week, but
  the numbers inside them (Total Revenue, Completed Consults, occupancy %,
  cancellation figures, etc.) are still manually typed into Weekly Input —
  same as today. Automating that extraction is the highest-leverage next
  step.
- **Revenue by payer (Private/Medicare/DVA/WorkCover/NDIS/Other), staff/
  clinic/loan cost lines, and clinic-wide UCVA/NCVA/TPR rollups** — called
  for in the spec but no data source exists yet; the Revenue and Clinic
  Health pages show an honest "not tracked yet" placeholder instead of
  fabricated numbers.
- **Bonus "tier reached" verdict.** The Senior Physio bonus tracker
  reproduces the sheet's verified cumulative-turnover / base-target /
  pacing-% math, but deliberately does **not** compute which bonus tier is
  "reached" — the sheet's exact formula for that couldn't be reverse-
  engineered with confidence from the rendered values alone, and getting it
  wrong on numbers tied to staff pay would be worse than leaving it manual.
  Confirm the formula with the business, then wire it up.
- **Training Log and marketing Content Calendar** modules from the
  spreadsheet — explicitly out of scope for this build per your decision.
- **Historical backfill** — this ships with an empty dataset (aside from
  the two seeded senior-physio provider records). Importing the existing
  spreadsheet's history is a separate task if you want it.
