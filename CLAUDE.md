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
│   ├── layout.tsx              # Root layout — uses BottomNavWrapper (server component)
│   ├── page.tsx                # Feed page (trending/new/ending tabs, PostCard list)
│   ├── globals.css             # Tailwind import + CSS vars
│   ├── actions.ts              # Server actions: toggleLike
│   ├── report-actions.ts       # Server action: createReport (post/comment/user)
│   ├── (auth)/                 # Auth route group (centered layout, no nav)
│   │   ├── layout.tsx          # Centered card layout with "Spill" heading
│   │   ├── actions.ts          # Server actions: loginWithOtp, verifyOtp, resendOtp, completeOnboarding
│   │   ├── login/page.tsx      # Email input → .edu validation → university check → OTP send
│   │   ├── verify/page.tsx     # 6-digit OTP input → verify → redirect to /onboarding or /
│   │   └── onboarding/page.tsx # Handle + display name → create public.users row
│   ├── create/page.tsx         # Post creation form
│   ├── search/page.tsx         # Search users page
│   ├── profile/
│   │   ├── page.tsx            # Current user's profile
│   │   └── [handle]/page.tsx   # Public profile view
│   ├── post/[id]/
│   │   ├── page.tsx            # Thread view (post + comments, shows removed comment placeholders)
│   │   └── actions.ts          # Server action: createComment
│   └── mod/
│       ├── page.tsx            # Moderation queue (Open/Reviewed/Dismissed tabs)
│       ├── actions.ts          # Server actions: removePost, removeComment, suspendUser, dismissReport
│       └── report-card.tsx     # Report card component (expandable content, mod action buttons)
├── components/
│   ├── bottom-nav.tsx          # Bottom tab bar (Feed, Search, Post, Profile + conditional Mod tab)
│   ├── bottom-nav-wrapper.tsx  # Server component — fetches user role, passes isModerator to BottomNav
│   ├── comment-composer.tsx    # Comment input form
│   ├── comment-list.tsx        # Comment list with report flag icons + removed comment placeholders
│   ├── feed-tabs.tsx           # Trending/New/Ending tab selector
│   ├── post-card.tsx           # Post card with like, comment, and report flag buttons
│   └── report-modal.tsx        # Reusable report modal (reason dropdown, details textarea)
├── lib/
│   ├── time.ts                 # formatRelativeTime, timeRemaining helpers
│   └── supabase/
│       ├── client.ts           # Browser Supabase client (createBrowserClient)
│       ├── server.ts           # Server Supabase client (createServerClient with cookies)
│       └── middleware.ts       # Supabase client for proxy context (cookie read/write on req/res)
└── proxy.ts                    # Route protection — public routes, onboarding, /mod (role check), protected

supabase/
└── migrations/
    ├── 001_initial_schema.sql                # Full schema + RLS + indexes + seed data
    ├── 002_users_insert_policy.sql           # INSERT policy for users table
    ├── 003_posts_subject_and_body_limit.sql  # Added subject column, increased body limit to 1000
    ├── 004_drop_author_target_unique.sql     # Removed unique constraint on author+target
    ├── 005_counter_triggers.sql              # Triggers for like_count and comment_count
    └── 006_moderation_rls_policies.sql       # UPDATE policies for moderators on reports, posts, comments, users
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
- **Mod routes** (auth + profile + moderator/admin role required): `/mod`
- **Protected** (auth + profile required): everything else
- Proxy fetches `id, role` from user profile and refreshes Supabase session cookies on every request

## Database Schema (key tables)
- **universities**: id, name, email_domain (seeded with umn.edu, test.edu)
- **users**: id (refs auth.users), university_id, email, handle, display_name, role (`user`/`moderator`/`admin`), status (`active`/`suspended`/`deleted`)
- **posts**: id, university_id, author_user_id, target_user_id, subject (1-200 chars), body (1-1000 chars), expires_at, like_count, comment_count, status (`active`/`expired`/`removed`), removed_at, removed_by, removal_reason
- **comments**: id, post_id, university_id, author_user_id, body (1-300 chars), parent_comment_id, status (`active`/`removed`), removed_at, removed_by, removal_reason
- **likes**: post_id + user_id (unique)
- **reports**: reporter_user_id, entity_type (`post`/`comment`/`user`), entity_id, reason, details, status (`open`/`reviewed`/`dismissed`)
- **moderation_actions**: moderator_user_id, action_type, entity_type, entity_id, reason
- All tables have RLS enabled. Users can only see data within their own university (via `current_user_university_id()` helper function).
- Moderators/admins have UPDATE policies on reports, posts, comments, and users within their university.

## Completed Steps
- **Step 1**: Project scaffolding + Supabase setup + full DB schema deployed
- **Step 2**: Authentication & onboarding (OTP flow, route protection, profile creation)
- **Step 3**: Feed page (trending/new/ending tabs, PostCard with like counts)
- **Step 4**: Search users, public profiles, post creation form
- **Step 5**: Like/unlike with optimistic UI, counter triggers
- **Step 6**: Thread view, comments with anonymous identity (Anon 1 = OP), comment composer
- **Step 7**: Reports & moderation console
  - Report modal (reason dropdown: harassment, hate speech, false info, spam, privacy violation, other + optional details)
  - Flag icon on posts and comments to trigger report modal
  - `createReport` server action with auth/suspended/rate-limit (10/day)/ownership checks
  - Removed comment placeholders ("[This comment has been removed]") in thread view
  - Conditional "Mod" tab in bottom nav (shield icon, only for moderators/admins)
  - `/mod` route protection (redirects non-moderators to `/`)
  - Moderation queue page with Open/Reviewed/Dismissed tabs
  - Report cards with expandable content (fetches entity on-demand), two-step action buttons (reason input → confirm)
  - Mod actions: removePost, removeComment, suspendUser (cannot suspend other mods/admins), dismissReport
  - All mod actions log to `moderation_actions` table and update report status

## What's Next
The spec document is at `Spill_Project_Description.txt`. Remaining features may include: notifications, post expiration handling, user profile editing, admin panel, and deployment.

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
