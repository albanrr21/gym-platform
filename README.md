# Gym Platform (Multi-tenant)

Next.js + Supabase gym platform with subdomain-based tenancy (e.g. `ironworks.localhost:3000`).

## What it does

- Auth (register/login) scoped to a gym
- Log workouts (exercises + sets + RPE)
- Dashboard: recent workouts + quick links
- Analytics + leaderboard
- AI features: AI demo chat + AI performance report (OpenAI)

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
- `RAPIDAPI_KEY` (exercise search/images)
- `ROOT_DOMAIN` / `NEXT_PUBLIC_ROOT_DOMAIN` (used for subdomain routing in prod)

### 3) Run

```bash
pnpm dev
```

Open:

- Main app: `http://localhost:3000`
- Tenant app (example): `http://yourgym.localhost:3000`

## Database notes (Supabase)

- Migrations live in `supabase/migrations/`
- Workout logging uses an RPC function `log_workout_with_sets` (created by migrations)

## Live

- Add your live URL here (if deployed): `https://alban-rrahmani.me/login`
