# Spill — Project Context

## What is Spill?
Anonymous college confessions platform. Students sign in with their .edu email, pick a handle, and post confessions about other students at their university. Posts are scoped to the user's university. Authors can choose to post anonymously (default) or reveal their identity.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **Auth & DB**: Supabase (hosted) — OTP email auth, Postgres with RLS
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript (strict)
- **Fonts**: Geist Sans + Geist Mono
- **Deployment**: Vercel (auto-deploys from `main` branch on GitHub)

## Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout — ThemeProvider, SettingsIcon, BottomNavWrapper
│   ├── page.tsx                # Feed page (trending/new/ending tabs, PostCard list)
│   ├── globals.css             # Tailwind import + CSS vars + class-based dark mode (@custom-variant)
│   ├── actions.ts              # Server actions: toggleLike
│   ├── report-actions.ts       # Server action: createReport (post/comment/user)
│   ├── (auth)/                 # Auth route group (centered layout, no nav)
│   │   ├── layout.tsx          # Centered card layout with "Spill" heading
│   │   ├── actions.ts          # Server actions: loginWithOtp, verifyOtp, resendOtp, completeOnboarding
│   │   ├── login/page.tsx      # Email input → .edu validation → university check → OTP send
│   │   ├── verify/page.tsx     # 6-digit OTP input → verify → redirect to /onboarding or /
│   │   └── onboarding/page.tsx # Handle + display name → create public.users row
│   ├── create/
│   │   ├── page.tsx            # Post creation form (target picker, subject, body, anonymous toggle, expiration toggle)
│   │   └── actions.ts          # Server actions: createPost, getCurrentUserHandle, searchTargetUsers, checkPhoneNumber
│   ├── search/
│   │   ├── page.tsx            # Search users page (activity-ranked, infinite scroll)
│   │   └── actions.ts          # Server action: searchUsersRanked (RPC, paginated)
│   ├── profile/
│   │   ├── page.tsx            # Current user's profile (redirects to /profile/[handle])
│   │   └── [handle]/page.tsx   # Public profile view (posts about this user, sort tabs)
│   ├── post/[id]/
│   │   ├── page.tsx            # Thread view (post + comments, identity choice, anon numbering)
│   │   └── actions.ts          # Server action: createComment (with isAnonymous + identity lock)
│   ├── settings/
│   │   ├── page.tsx            # Settings page (theme toggle, sign out, profile link, X close button)
│   │   └── actions.ts          # Server actions: signOut, updateAvatarUrl, getCurrentUserProfile, updatePhoneNumber
│   └── mod/
│       ├── page.tsx            # Moderation queue (Open/Reviewed/Dismissed tabs)
│       ├── actions.ts          # Server actions: removePost, removeComment, suspendUser, dismissReport
│       └── report-card.tsx     # Report card component (expandable content, mod action buttons)
├── components/
│   ├── bottom-nav.tsx          # Bottom tab bar (Feed, Search, Post, Profile + conditional Mod tab)
│   ├── bottom-nav-wrapper.tsx  # Server component — fetches user role, passes isModerator to BottomNav
│   ├── comment-composer.tsx    # Comment input with identity choice (anonymous/revealed, locked per thread)
│   ├── avatar.tsx              # Reusable Avatar component (xs/sm/md/lg, anonymous silhouette, image, placeholder)
│   ├── avatar-upload.tsx       # Avatar upload component (file picker, Supabase Storage upload, server action save)
│   ├── comment-list.tsx        # Comment list (Anon N or @handle, OP badge, report flags, avatars)
│   ├── feed-tabs.tsx           # Trending/New/Ending tab selector (useTransition for pending state)
│   ├── profile-sort-tabs.tsx   # Profile sort tabs (Top/Newest/Comments/Ending, useTransition)
│   ├── post-card.tsx           # Post card: "[avatar] Anonymous → [avatar] @target" + like/comment/report
│   ├── report-modal.tsx        # Reusable report modal (reason dropdown, details textarea)
│   ├── settings-icon.tsx       # Persistent gear icon (fixed top-right, hidden on auth + settings routes)
│   └── theme-provider.tsx      # ThemeProvider context + useTheme hook (light/dark/system, localStorage)
├── lib/
│   ├── time.ts                 # formatRelativeTime, timeRemaining (nullable) helpers
│   ├── phone.ts                # normalizePhone, formatPhoneDisplay, lastFour helpers
│   ├── current-user.ts         # getCurrentUser() — fetches auth user + public profile
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
    ├── 006_moderation_rls_policies.sql       # UPDATE policies for moderators on reports, posts, comments, users
    ├── 007_optional_expiration.sql           # expires_at nullable + clear existing expirations
    ├── 008_identity_reveal.sql              # is_anonymous on posts and comments
    ├── 009_search_users_by_activity.sql    # RPC function: search_users_by_activity (ranked search)
    ├── 010_search_by_name.sql              # Update RPC to search by handle OR display_name
    ├── 011_avatar_url.sql                  # Add avatar_url column to users table
    ├── 012_avatar_storage.sql              # Create avatars storage bucket + RLS policies
    ├── 013_search_rpc_avatar.sql           # Update search RPC to return avatar_url
    ├── 014_placeholder_profiles.sql        # Placeholder profiles table, RLS, generate_handle + claim RPCs
    ├── 015_posts_placeholder_target.sql    # Add target_placeholder_id to posts, XOR constraint
    ├── 016_users_phone_number.sql          # Add phone_number to users table
    ├── 017_placeholder_counters.sql        # Triggers for placeholder post_count and unique_poster_count
    └── 018_search_rpc_placeholder.sql      # Update search RPC to include placeholder profiles
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
- **users**: id (refs auth.users), university_id, email, handle, display_name, avatar_url (nullable), phone_number (nullable), role (`user`/`moderator`/`admin`), status (`active`/`suspended`/`deleted`)
- **placeholder_profiles**: id, phone_number (E.164), phone_last_four, handle (generated `phone_XXXX`), university_id, created_by, claimed_by (nullable), claimed_at, post_count, unique_poster_count. UNIQUE(phone_number, university_id). RLS university-scoped.
- **posts**: id, university_id, author_user_id, target_user_id (nullable), target_placeholder_id (nullable, FK to placeholder_profiles), subject (1-200 chars), body (1-1000 chars), is_anonymous (bool, default true), expires_at (nullable timestamptz), like_count, comment_count, status (`active`/`expired`/`removed`), removed_at, removed_by, removal_reason. XOR constraint: exactly one of target_user_id or target_placeholder_id must be set.
- **comments**: id, post_id, university_id, author_user_id, body (1-300 chars), is_anonymous (bool, default true), parent_comment_id, status (`active`/`removed`), removed_at, removed_by, removal_reason
- **likes**: post_id + user_id (unique)
- **reports**: reporter_user_id, entity_type (`post`/`comment`/`user`), entity_id, reason, details, status (`open`/`reviewed`/`dismissed`)
- **moderation_actions**: moderator_user_id, action_type, entity_type, entity_id, reason
- All tables have RLS enabled. Users can only see data within their own university (via `current_user_university_id()` helper function).
- Moderators/admins have UPDATE policies on reports, posts, comments, and users within their university.

## Post Identity System
- **Anonymous posts** (default): header shows `Anonymous → @targetHandle`
- **Revealed posts**: header shows `@authorHandle → @targetHandle` (author handle links to their profile)
- Create form has a "Post anonymously" toggle (default: on). Turning it off shows the user's handle.
- `is_anonymous` boolean stored on each post. Feed, profile, and thread queries join on both `author` and `target` foreign keys.

## Comment Identity System
- **Per-thread identity choice**: first time commenting in a thread, user chooses "Anonymously" or "As @handle"
- **Locked per thread**: once chosen, the identity mode cannot be changed for that thread. Server action validates consistency.
- **Anonymous commenters**: get thread-local "Anon N" numbers (only anonymous users are numbered)
- **Revealed commenters**: show @handle
- **OP numbering**: if post was anonymous, OP = Anon 1 (reserved). If post was revealed, Anon counter starts at 1 for commenters.
- **Returning users**: composer auto-uses previous choice, shows identity label, no choice buttons
- `is_anonymous` boolean stored on each comment row

## Post Expiration System
- **Optional**: posts live forever by default. Author can toggle "Auto-delete after N hours" (1-720) on the create form.
- `expires_at` is nullable. NULL = no expiration.
- Feed query: `.or("expires_at.is.null,expires_at.gt.${now}")` — shows non-expired + permanent posts
- "Ending Soon" tab: filters to only posts with expiration set, ordered by soonest expiring
- Thread view: `isActive` checks both status and expiration; comment composer hidden for expired posts
- Comment action: null-guards `expires_at` before checking expiration (`new Date(null)` returns epoch — known gotcha)

## Completed Features
1. **Auth & onboarding**: OTP email flow, .edu validation, handle creation, route protection
2. **Feed**: trending (decay formula), new, ending soon tabs; PostCard with like/comment/report
3. **Search & profiles**: activity-ranked user search with infinite scroll, public profile with posts-about-user, sort tabs (top/newest/comments/ending)
4. **Post creation**: target picker (debounced search), subject/body, anonymous toggle, expiration toggle
5. **Likes**: optimistic UI, counter triggers in DB
6. **Thread view**: post + comments, anonymous identity system, comment composer with identity choice
7. **Reports & moderation**: report modal, flag icons, mod console (Open/Reviewed/Dismissed), mod actions (remove post/comment, suspend user, dismiss report), moderation_actions audit log
8. **Optional expiration**: author-chosen auto-delete timer, permanent posts by default
9. **Identity reveal**: anonymous/revealed for both posts and comments, per-thread locked comment identity
10. **Deployment**: Vercel (auto-deploy from GitHub), Supabase hosted DB
11. **Settings page**: theme toggle (light/dark/system) with localStorage persistence, sign-out button, profile link, gear icon on all pages, X close button to go back
12. **Activity-ranked search**: users ranked by posts about them + comments on those posts, Supabase RPC with pagination, IntersectionObserver infinite scroll
13. **Avatars**: user-uploaded profile pictures via Supabase Storage. Displayed in post cards, comments, search results, target picker, profile pages, and settings. Anonymous posts/comments always show a generic silhouette. Upload available during onboarding, from settings, and from own profile page.
14. **Placeholder profiles**: Phone-number-based shadow profiles for people not yet on the platform. Users can post about someone by entering their phone number when no search results match. System creates a `phone_XXXX` placeholder profile. Posts accumulate under the same placeholder. When the real person signs up and adds their phone number (in settings or onboarding), all posts auto-transfer to their real profile via `claim_placeholder_profile` RPC. Non-anonymous posting is the default for placeholder targets. Search results include unclaimed placeholders with "(not on Spill)" badge.
15. **Button press feedback**: All interactive elements have `active:` Tailwind states (scale/opacity) for tap/click feedback. Global `-webkit-tap-highlight-color: transparent` suppresses browser defaults.
16. **Loading skeletons**: `loading.tsx` files for feed, profile, thread, and mod pages show skeleton UI during navigation.
17. **Fast tab switching**: Feed tabs and profile sort tabs use `useTransition` for instant pending state during server re-renders.

## Theme System
- **Class-based dark mode**: Tailwind v4 `@custom-variant dark` in `globals.css` — activates `dark:` utilities via `.dark` class on `<html>`
- **ThemeProvider** (`src/components/theme-provider.tsx`): React context storing user choice (`light`/`dark`/`system`) in localStorage
- **FOUC prevention**: inline `<script>` in `layout.tsx` `<head>` reads localStorage and sets `.dark` class before paint
- **Settings access**: gear icon (`src/components/settings-icon.tsx`) fixed top-right on all pages, hidden on auth routes and `/settings`
- **Settings page** (`/settings`): theme toggle (3 buttons), sign-out, profile link, fixed X close button (same position as gear icon) that navigates back via `router.back()`

## Search System
- **RPC function** `search_users_by_activity`: Supabase SQL function that ranks users by activity (posts targeting them + comment_count on those posts)
- **On load**: shows top 20 users by activity at the user's university (no typing needed)
- **On search**: debounced (300ms) handle or display_name filter, still ranked by activity
- **Pagination**: `LIMIT`/`OFFSET` in the RPC, 20 results per page
- **Infinite scroll**: `IntersectionObserver` on sentinel div, auto-fetches next page when scrolled near bottom
- **Future optimization**: consider a materialized `user_activity` table refreshed on a schedule instead of computing on the fly

## Placeholder Profile System
- **Separate table**: `placeholder_profiles` is independent from `users` (no auth.users FK). Posts reference either `target_user_id` (real user) or `target_placeholder_id` (placeholder), never both (XOR constraint).
- **Handle generation**: `generate_placeholder_handle(phone_last_four, university_id)` SQL function generates `phone_XXXX`, deduplicating against both tables.
- **University-scoped**: Placeholders inherit the poster's university. Same phone at different universities = separate placeholders.
- **Create flow**: When target search returns 0 results, UI offers "Post about someone not on Spill" → phone number input → `checkPhoneNumber` action validates → finds/creates placeholder → post targets the placeholder.
- **Claiming**: `claim_placeholder_profile(phone_number, user_id, university_id)` SECURITY DEFINER RPC reassigns all posts and marks placeholder as claimed. Called automatically when a user adds their phone number.
- **Phone storage**: E.164 format (`+15551234567`). Normalized via `src/lib/phone.ts`. Stored on both `users.phone_number` and `placeholder_profiles.phone_number`.
- **Counter triggers**: `post_count` and `unique_poster_count` on placeholders maintained by AFTER INSERT trigger on posts (migration 017). Future SMS notification uses `unique_poster_count > 1` threshold.
- **Search integration**: RPC returns `is_placeholder` boolean. Unclaimed placeholders appear in search results with "(not on Spill)" badge.
- **Profile fallback**: `/profile/[handle]` page first looks up `users`, then falls back to `placeholder_profiles` for unclaimed placeholders.
- **Phone number never exposed publicly**: Only last 4 digits appear in the generated handle. `phone_number` column never selected in client-facing queries.

## What's Next
The spec document is at `Spill_Project_Description.txt`. Remaining features may include: notifications, user profile editing, admin panel, and further polish.

## Commands
```bash
npm run dev    # Start dev server (localhost:3000)
npm run build  # Production build
npm run lint   # ESLint
```

## Environment
- **Local**: Supabase credentials in `.env.local` (not committed)
- **Vercel**: Same env vars set in Vercel dashboard
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Optional (for future use): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Key Patterns & Gotchas
- **Supabase joins**: use foreign key syntax like `author:users!posts_author_user_id_fkey(handle, display_name)` — cast result with `as unknown as { handle: string; ... } | null`
- **Nullable expires_at**: always null-guard before `new Date(expires_at)` — `new Date(null)` returns epoch (1970), not an error
- **Feed/profile expiration filter**: use `.or("expires_at.is.null,expires_at.gt.${now}")` — never `.gt("expires_at", now)` alone (hides permanent posts)
- **Server actions in thread**: `boundCreateComment` wraps `createComment` with post ID closure via `"use server"` inline
- **Anonymous numbering**: built server-side in thread page, only anonymous participants get numbers, stripped from client via SafeComment type
- **Client components needing server data**: use server actions called in useEffect (e.g., `getCurrentUserHandle` in create form)
- **Avatar privacy**: anonymous posts/comments must never expose the real avatar. Two layers: (1) `Avatar` component ignores `src` when `isAnonymous=true`, (2) SafeComment sets `avatarUrl: null` when `is_anonymous=true` server-side
- **Avatar uploads**: client-side upload to Supabase Storage at `{userId}/avatar.{ext}`, then server action saves public URL to `users.avatar_url`. Cache-busting `?t=timestamp` appended after upload.
- **Supabase Storage bucket**: `avatars` (public, 2MB limit, JPEG/PNG/WebP only). RLS: users can upload/update/delete their own folder, public read.
- **Dual-target posts**: Post queries must join on both `target:users!posts_target_user_id_fkey(...)` and `target_placeholder:placeholder_profiles!posts_target_placeholder_id_fkey(handle)`. Use `target?.handle ?? targetPlaceholder?.handle ?? "unknown"` to resolve the display handle.
- **Phone normalization**: Always use `normalizePhone()` from `src/lib/phone.ts` before storing or comparing phone numbers. All phones stored in E.164 format.
- **Placeholder XOR constraint**: When inserting posts, explicitly set the unused target to `null` (e.g., `target_user_id: null` for placeholder posts). The CHECK constraint requires exactly one non-null target.
