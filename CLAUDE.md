# Spill — Project Context

## What is Spill?
Anonymous college confessions platform. Students sign in with their .edu email, pick a handle, and post anonymous confessions about other students at their university. Posts are scoped to the user's university.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **Auth & DB**: Supabase (hosted) — OTP email auth, Postgres with RLS
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript (strict)
- **Fonts**: Geist Sans + Geist Mono

## Project Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout (metadata: "Spill")
│   ├── page.tsx            # Feed page (placeholder — "Feed coming soon")
│   ├── globals.css         # Tailwind import + CSS vars
│   └── (auth)/             # Auth route group (centered layout, no nav)
│       ├── layout.tsx      # Centered card layout with "Spill" heading
│       ├── actions.ts      # Server actions: loginWithOtp, verifyOtp, resendOtp, completeOnboarding
│       ├── login/page.tsx  # Email input → .edu validation → university check → OTP send
│       ├── verify/page.tsx # 6-digit OTP input → verify → redirect to /onboarding or /
│       └── onboarding/page.tsx  # Handle + display name → create public.users row
├── lib/
│   └── supabase/
│       ├── client.ts       # Browser Supabase client (createBrowserClient)
│       ├── server.ts       # Server Supabase client (createServerClient with cookies)
│       └── middleware.ts   # Supabase client for proxy context (cookie read/write on req/res)
└── proxy.ts                # Route protection (Next.js 16 "proxy" convention, replaces middleware.ts)

supabase/
└── migrations/
    ├── 001_initial_schema.sql          # Full schema: universities, users, posts, comments, likes, reports, moderation_actions + RLS + indexes + seed data
    └── 002_users_insert_policy.sql     # INSERT policy for users table (id = auth.uid())
```

## Auth Flow (fully working)
1. Unauthenticated → redirected to `/login` by proxy
2. Enter .edu email → server action validates domain exists in `universities` table → Supabase sends OTP
3. Enter OTP on `/verify` → Supabase verifies, creates session
4. No `public.users` profile → redirected to `/onboarding`
5. Pick handle (unique, 3-20 chars, alphanumeric + underscores) + optional display name → row created in `public.users`
6. Redirected to `/` (feed)
7. Authenticated users visiting `/login` or `/onboarding` → redirected to `/`

## Route Protection (src/proxy.ts)
- **Public routes** (no auth): `/login`, `/verify`
- **Onboarding** (auth required, no profile needed): `/onboarding`
- **Protected** (auth + profile required): everything else
- Proxy also refreshes Supabase session cookies on every request

## Database Schema (key tables)
- **universities**: id, name, email_domain (seeded with umn.edu, test.edu)
- **users**: id (refs auth.users), university_id, email, handle, display_name, role, status
- **posts**: id, university_id, author_user_id, target_user_id, body (1-500 chars), expires_at, like/comment counts
- **comments**: id, post_id, author_user_id, body (1-300 chars), parent_comment_id (threading)
- **likes**: post_id + user_id (unique)
- **reports**: reporter, entity_type/id, reason, status
- **moderation_actions**: moderator actions log
- All tables have RLS enabled. Users can only see data within their own university (via `current_user_university_id()` helper function).

## Completed Steps
- **Step 1**: Project scaffolding + Supabase setup + full DB schema deployed
- **Step 2**: Authentication & onboarding (OTP flow, route protection, profile creation)

## What's Next
The feed, posting, comments, likes, user profiles, and moderation features still need to be built. The spec document is at `Spill_Project_Description.txt`.

## Commands
```bash
npm run dev    # Start dev server (localhost:3000)
npm run build  # Production build
npm run lint   # ESLint
```

## Environment
Supabase credentials are in `.env.local` (not committed). Required vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
