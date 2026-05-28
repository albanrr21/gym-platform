# Gym Platform (Multi-tenant)

Next.js + Supabase gym platform with subdomain-based tenancy (e.g. `elite.localhost:3000`).

## What it does

- **Multi-tenant architecture** — each gym runs on its own subdomain with data isolation via RLS
- **Auth** — register/login scoped to a gym, cross-subdomain session handoff via secure POST-redirect
- **Workout logging** — exercises with set-level tracking (weight, reps, RPE), exercise search via RapidAPI with info modals, GIF demonstrations, and previous set history
- **Dashboard** — stat cards, quick actions, recent workouts, and responsive navigation
- **Progress analytics** — recharts-powered total volume, workouts/week chart, strength trend graph, top exercises, best lifts
- **Leaderboard** — volume + consistency rankings across gym members with real-time updates
- **AI performance report** — streaming OpenAI response for fatigue assessment, plateau detection, and progression suggestions
- **AI demo chat** — multi-turn chat with workout/nutrition/admin system prompts and prompt injection safeguards
- **Saved Exercises** — save, search, and manage your favorite exercises
- **Profile Management** — edit display name, change password, and view gym details

## Local setup

### 1) Install

```bash
pnpm install
```

### 2) Environment variables

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- `OPENAI_API_KEY` - OpenAI API key
- `RAPIDAPI_KEY` - RapidAPI key for ExerciseDB
- `ROOT_DOMAIN` / `NEXT_PUBLIC_ROOT_DOMAIN` - Root domain for subdomain routing (leave blank for local dev)

### 3) Run

```bash
pnpm dev
```

Open:

- Main app: `http://localhost:3000`
- Tenant app (example): `http://elite.localhost:3000`

## Screenshots

*(Screenshots placeholder - to be added)*

## Architecture

See the [System Architecture Diagram](docs/architecture.html) for an overview of the system design and component interactions.

## Database notes (Supabase)

- Migrations live in `supabase/migrations/`
- Core tables: `gyms`, `users`, `workouts`, `exercises`, `sets`, `ai_reports`, `leaderboard_snapshots`, `saved_exercises`
- Workout logging uses an RPC function `log_workout_with_sets` (transactional insert of workout + exercises + sets)
- RLS enforces gym-level data isolation on all tables

## Live Deployment

- **Live URL:** `https://alban-rrahmani.me/login`
- **Tenant URL:** `https://elite.alban-rrahmani.me/dashboard`

## CI secrets

GitHub Actions expects these repository secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `RAPIDAPI_KEY`
- `ROOT_DOMAIN`

## Test Credentials

For academic submission or testing, use an account provisioned in Supabase or register a new tenant user locally.
