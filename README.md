# Gym Platform (Multi-tenant)

Next.js + Supabase gym platform with subdomain-based tenancy (e.g. `elite.localhost:3000`).

## What it does

- **Multi-tenant architecture** — each gym runs on its own subdomain with data isolation via RLS
- **Auth** — register/login scoped to a gym, cross-subdomain session handoff
- **Workout logging** — exercises with set-level tracking (weight, reps, RPE), exercise search via RapidAPI with info modals and GIF demonstrations
- **Dashboard** — recent workouts, quick links to all features
- **Progress analytics** — total volume, workouts/week chart, strength trend graph, top exercises, best lifts
- **Leaderboard** — volume + consistency rankings across gym members
- **AI performance report** — fatigue assessment, plateau detection, progression suggestions, weekly summary (OpenAI, based on real workout data)
- **AI demo chat** — standalone prototype chat with workout/nutrition/admin system prompts

## Local setup

### 1) Install

```bash
pnpm install
```

### 2) Environment variables

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `OPENAI_API_KEY` (for `/ai-demo` + AI report)
- `RAPIDAPI_KEY` (exercise search/images via ExerciseDB)
- `ROOT_DOMAIN` / `NEXT_PUBLIC_ROOT_DOMAIN` (used for subdomain routing in prod)

### 3) Run

```bash
pnpm dev
```

Open:

- Main app: `http://localhost:3000`
- Tenant app (example): `http://elite.localhost:3000`

## Database notes (Supabase)

- Migrations live in `supabase/migrations/` (9 migrations)
- Core tables: `gyms`, `users`, `workouts`, `exercises`, `sets`, `ai_reports`, `leaderboard_snapshots`
- Workout logging uses an RPC function `log_workout_with_sets` (transactional insert of workout + exercises + sets)
- RLS enforces gym-level data isolation on all tables

## Live

- Deployed at: `https://alban-rrahmani.me/login`
