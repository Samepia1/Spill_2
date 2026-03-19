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
│   ├── layout.tsx              # Root layout — ThemeProvider, TopBarIcons, BottomNavWrapper
│   ├── page.tsx                # Feed page (trending/new/ending tabs, PostCard list)
│   ├── globals.css             # Tailwind import + CSS vars + class-based dark mode (@custom-variant)
│   ├── actions.ts              # Server actions: toggleLike (+ notification on like), searchMentionUsers (@mention autocomplete)
│   ├── notifications/
│   │   └── actions.ts          # Server actions: getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead
│   ├── report-actions.ts       # Server action: createReport (post/comment/user)
│   ├── (auth)/                 # Auth route group (centered layout, no nav)
│   │   ├── layout.tsx          # Centered card layout with "Spill" heading
│   │   ├── actions.ts          # Server actions: loginWithOtp, verifyOtp, resendOtp, completeOnboarding
│   │   ├── login/page.tsx      # Email input → .edu validation → university check → OTP send
│   │   ├── verify/page.tsx     # 6-digit OTP input → verify → redirect to /onboarding or /
│   │   └── onboarding/page.tsx # Handle + display name → create public.users row
│   ├── create/
│   │   ├── page.tsx            # Post creation form (target picker, subject, body, media picker, anonymous toggle, expiration toggle, @mention in body)
│   │   ├── actions.ts          # Server actions: createPost (+ mention notifications), getCurrentUserHandle, getCurrentUserId, searchTargetUsers, checkPhoneNumber, getPlaceholderSmsData, recordSmsPrompt
│   │   └── success/page.tsx    # Post success page with SMS invite prompt for placeholder targets
│   ├── search/
│   │   ├── page.tsx            # Search users page (activity-ranked, infinite scroll)
│   │   └── actions.ts          # Server action: searchUsersRanked (RPC, paginated)
│   ├── profile/
│   │   ├── page.tsx            # Current user's profile — client component, router.replace() to /profile/[handle]
│   │   └── [handle]/page.tsx   # Public profile view (posts about this user, sort tabs)
│   ├── post/[id]/
│   │   ├── page.tsx            # Thread view (post + comments, identity choice, anon numbering, scroll-to-comment)
│   │   └── actions.ts          # Server action: createComment (with isAnonymous + identity lock + mention notifications)
│   ├── settings/
│   │   ├── page.tsx            # Settings page (theme toggle, email notification toggles, sign out, profile link, X close button)
│   │   └── actions.ts          # Server actions: signOut, updateAvatarUrl, getCurrentUserProfile, updatePhoneNumber, updateEmailPreferences
│   ├── api/
│   │   └── unsubscribe/route.ts # GET handler: token-based email unsubscribe (service role client)
│   ├── unsubscribe/
│   │   └── page.tsx            # Unsubscribe confirmation page
│   ├── invite/
│   │   └── page.tsx            # Referral landing page (stores ref in localStorage, redirects to /login)
│   └── mod/
│       ├── page.tsx            # Moderation queue (Open/Reviewed/Dismissed tabs)
│       ├── actions.ts          # Server actions: removePost, removeComment, suspendUser, dismissReport
│       └── report-card.tsx     # Report card component (expandable content, mod action buttons)
├── components/
│   ├── bottom-nav.tsx          # Bottom tab bar (Feed, Search, Post, Profile + conditional Mod tab). Profile links to /profile/[handle] directly.
│   ├── bottom-nav-wrapper.tsx  # Server component — fetches user role + handle, passes isModerator + userHandle to BottomNav
│   ├── comment-composer.tsx    # Comment input with identity choice, @mention autocomplete, dual-state text management
│   ├── mention-autocomplete.tsx # @mention autocomplete dropdown (thread participants + global user search)
│   ├── mention-text.tsx        # Renders text with styled, clickable @mentions (blue for users, violet for anons)
│   ├── scroll-to-comment.tsx   # Client component: scroll to comment from ?comment= URL param
│   ├── avatar.tsx              # Reusable Avatar component (xs/sm/md/lg, anonymous silhouette, image, placeholder)
│   ├── avatar-upload.tsx       # Avatar upload component (file picker, client-side compression, Supabase Storage upload)
│   ├── avatar-lightbox.tsx     # Clickable avatar fullscreen overlay (profile pages, Escape/backdrop to close)
│   ├── media-picker.tsx        # Post media file picker (grid preview, upload progress, add/remove)
│   ├── media-carousel.tsx      # Swipeable media carousel (scroll-snap, dot indicators, video play)
│   ├── comment-list.tsx        # Comment list (Anon N or @handle, OP badge, report flags, avatars, mention rendering)
│   ├── feed-tabs.tsx           # Trending/New/Ending tab selector (useTransition for pending state)
│   ├── profile-sort-tabs.tsx   # Profile sort tabs (Top/Newest/Comments/Ending, useTransition)
│   ├── post-card.tsx           # Post card: "[avatar] Anonymous → [avatar] @target" + like/comment/report
│   ├── report-modal.tsx        # Reusable report modal (reason dropdown, details textarea)
│   ├── top-bar-icons.tsx       # Bell icon (notifications dropdown) + gear icon (settings link), fixed top-right
│   └── theme-provider.tsx      # ThemeProvider context + useTheme hook (light/dark/system, localStorage)
├── lib/
│   ├── time.ts                 # formatRelativeTime, timeRemaining (nullable) helpers
│   ├── phone.ts                # normalizePhone, formatPhoneDisplay, lastFour helpers
│   ├── mentions.ts             # Mention parsing, display text conversion, anonMap builder, mention token helpers
│   ├── compress-image.ts       # compressImage (avatar, square crop) + compressPostImage (preserve aspect ratio)
│   ├── video-thumbnail.ts      # captureVideoThumbnail (canvas frame capture) + getVideoDimensions
│   ├── current-user.ts         # getCurrentUser() — fetches auth user + public profile
│   ├── email.ts                # Email notification utility (Resend client, cooldown, HTML templates, sendNotificationEmail)
│   └── supabase/
│       ├── client.ts           # Browser Supabase client (createBrowserClient)
│       ├── server.ts           # Server Supabase client (createServerClient with cookies)
│       ├── service.ts          # Service-role Supabase client (bypasses RLS, for unsubscribe route)
│       └── middleware.ts       # Supabase client for proxy context (cookie read/write on req/res)
├── hooks/
│   └── use-media-upload.ts     # Multi-file upload hook (validation, compression, Supabase Storage upload)
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
    ├── 018_search_rpc_placeholder.sql      # Update search RPC to include placeholder profiles
    ├── 019_post_media.sql                 # Post media table, storage bucket, nullable subject/body, media_count trigger
    ├── 020_notifications.sql              # Notifications table, indexes, RLS policies
    ├── 021_mention_notifications.sql      # Add comment_id to notifications for @mention scroll-to-comment
    ├── 022_email_preferences.sql          # Email notification preferences, cooldown timestamp, unsubscribe token on users
    ├── 023_increase_video_limit.sql      # Increase video upload limits
    └── 024_sms_invite.sql                # SMS invite prompt: last_sms_prompted_at on placeholders, referrals table
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
- **Public routes** (no auth): `/login`, `/verify`, `/invite`
- **Onboarding** (auth required, no profile needed): `/onboarding`
- **Mod routes** (auth + profile + moderator/admin role required): `/mod`
- **Protected** (auth + profile required): everything else
- Proxy fetches `id, role` from user profile and refreshes Supabase session cookies on every request

## Database Schema (key tables)
- **universities**: id, name, email_domain (seeded with umn.edu, test.edu)
- **users**: id (refs auth.users), university_id, email, handle, display_name, avatar_url (nullable), phone_number (nullable), role (`user`/`moderator`/`admin`), status (`active`/`suspended`/`deleted`)
- **placeholder_profiles**: id, phone_number (E.164), phone_last_four, handle (generated `phone_XXXX`), university_id, created_by, claimed_by (nullable), claimed_at, post_count, unique_poster_count, last_sms_prompted_at (nullable). UNIQUE(phone_number, university_id). RLS university-scoped.
- **referrals**: id, inviter_id (FK users), invitee_id (nullable FK users — filled on claim), placeholder_id (FK placeholder_profiles), university_id, created_at. RLS: insert/select own. Analytics-only tracking.
- **posts**: id, university_id, author_user_id, target_user_id (nullable), target_placeholder_id (nullable, FK to placeholder_profiles), subject (nullable, 1-200 chars), body (nullable, 1-1000 chars), media_count (int, default 0), is_anonymous (bool, default true), expires_at (nullable timestamptz), like_count, comment_count, status (`active`/`expired`/`removed`), removed_at, removed_by, removal_reason. XOR constraint: exactly one of target_user_id or target_placeholder_id must be set. Content constraint: at least one of subject, body, or media_count > 0.
- **post_media**: id, post_id (FK → posts, CASCADE), university_id, storage_path, public_url, media_type (`image`/`video`), file_size_bytes, mime_type, width (nullable), height (nullable), thumbnail_url (nullable, for videos), display_order, moderation_status (`pending`/`approved`/`rejected`, default `pending`), moderation_checked_at (nullable). RLS university-scoped. Trigger updates `posts.media_count`.
- **comments**: id, post_id, university_id, author_user_id, body (1-300 chars), is_anonymous (bool, default true), parent_comment_id, status (`active`/`removed`), removed_at, removed_by, removal_reason
- **likes**: post_id + user_id (unique)
- **reports**: reporter_user_id, entity_type (`post`/`comment`/`user`), entity_id, reason, details, status (`open`/`reviewed`/`dismissed`)
- **moderation_actions**: moderator_user_id, action_type, entity_type, entity_id, reason
- **notifications**: id, university_id, recipient_id (FK users), actor_id (FK users), type (text — `new_post`/`new_comment`/`new_like`/`new_mention`/extensible), post_id (FK posts), comment_id (nullable FK comments — for scroll-to-comment), actor_handle (nullable — NULL if anonymous), post_subject (denormalized), is_read (bool, default false), created_at. RLS: users read/update own only. Insert requires actor_id = auth.uid().
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
18. **Post media**: Photos and short videos (up to 10 per post, 10MB images / 50MB videos / 30s max video). Client-side image compression via `compressPostImage`. Videos uploaded as-is with canvas-based thumbnail capture. Supabase Storage bucket `post-media`. Displayed in a CSS scroll-snap carousel with dot indicators and 400px max-height bounding box (vertical images letterboxed with black bars, horizontal images fill width). Subject/body become optional when media is attached. `moderation_status` column on `post_media` table prepared for future Google Vision API integration.
19. **Direct profile navigation**: Bottom nav Profile tab links directly to `/profile/[handle]` instead of `/profile`. `BottomNavWrapper` fetches the user's handle alongside their role and passes it to `BottomNav`. The `/profile/page.tsx` fallback is a client component using `router.replace()` (not server-side `redirect()`) to avoid the "Rendered more hooks" error in the Next.js Router during client-side navigation. This fallback handles the case where the root layout caches `userHandle` as `null` after onboarding (shared layouts don't re-render on soft navigation).
20. **Avatar compression**: Client-side image compression before upload. Accepts images up to 10MB, crops to center square, resizes to 800x800, outputs as JPEG at 0.8 quality (typically 100-250KB). Uses Canvas API via `compressImage()` in `src/lib/compress-image.ts`. Applied in both `avatar-upload.tsx` (settings/profile) and `onboarding/page.tsx`. Supabase bucket limit stays at 2MB since compressed output is always well under.
21. **Fullscreen avatar viewer**: Clicking another user's avatar on their profile page opens a fullscreen lightbox overlay (`src/components/avatar-lightbox.tsx`). Shows 320px avatar on dark backdrop. Close via backdrop click, X button, or Escape key. Own profile still opens file picker (AvatarUpload). Placeholder profiles have no lightbox (no avatar).
22. **Notifications system**: Bell icon next to settings gear (top-right) with slide-down dropdown. `notifications` table stores denormalized notification data (actor_handle, post_subject) to render without joins. Four notification types: `new_post` (someone posted about you), `new_comment` (someone commented on your post), `new_like` (someone liked your post), `new_mention` (someone @mentioned you). Anonymous actions show "Someone" instead of handle. Self-notifications skipped. Unread count badge on bell icon. Dropdown shows last 20 notifications with type icons, relative time, and blue unread dots. Click to mark read + navigate to post. "Mark all as read" button. Fire-and-forget inserts in `createPost`, `createComment`, and `toggleLike` server actions — notification failures never block the primary action. Extensible: adding a new type is just a new insert call + message template in `NotificationMessage`.
23. **@Mention system**: Global mention engine for comments and post bodies. Typing `@` opens an autocomplete dropdown with thread participants (Anon 1, Anon 2, @handles) and global user search. Mentions stored as `@[label](type:id)` tokens in text, rendered as styled clickable elements (blue for user profiles, violet for anon scroll-to-comment). `@anonN` mentions are thread-local — resolved server-side via anonMap. Each mention generates a `new_mention` notification with `comment_id` for scroll-to-comment navigation. Multiple mentions per comment supported. Self-mentions silently ignored. Dual-state text management in composer: display text (clean `@label`) in textarea, raw text (with tokens) stored/submitted.
24. **Email notifications**: Resend-powered email notifications for three event types: `new_post`, `new_comment` (revealed identity only), `new_mention`. 2-hour per-user cooldown — if multiple events happen during cooldown, next email sends a digest of all unread notifications. Per-type toggles in settings (posts, comments, mentions). Token-based unsubscribe via `/api/unsubscribe`. Teaser-only emails (no post content) with branded HTML template. Fire-and-forget sends in server actions via `sendNotificationEmail()` from `src/lib/email.ts`. Env vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_BASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
25. **SMS invite prompt**: After posting about a placeholder target (someone not on Spill), redirects to a success page (`/create/success`) with a "Send Text" button that opens the native SMS app via `sms:` URI. Pre-filled message includes post count and referral link (`/invite?ref=userId`). 2-hour per-placeholder cooldown via `last_sms_prompted_at` column — if recently prompted, SMS section hidden but success confirmation still shown. Referral tracking via `referrals` table (inviter_id, invitee_id, placeholder_id). Invite landing page (`/invite`) stores referrer in localStorage, redirects to `/login`. On onboarding/settings phone claim, `linkReferral()` updates referral rows with invitee_id. Analytics only (no rewards). Non-placeholder posts keep direct redirect to feed.
26. **Phone number warning banners**: Amber warning on own profile page when phone number is missing: "Add your phone number in settings to see posts from people who don't know your handle." Links to `/settings`. Onboarding page has updated helper text explaining that adding a phone number links existing posts. `getCurrentUser()` now includes `phone_number` in the profile query.

## Theme System
- **Class-based dark mode**: Tailwind v4 `@custom-variant dark` in `globals.css` — activates `dark:` utilities via `.dark` class on `<html>`
- **ThemeProvider** (`src/components/theme-provider.tsx`): React context storing user choice (`light`/`dark`/`system`) in localStorage
- **FOUC prevention**: inline `<script>` in `layout.tsx` `<head>` reads localStorage and sets `.dark` class before paint
- **Top bar icons**: bell icon (notifications dropdown) + gear icon (settings link) in `src/components/top-bar-icons.tsx`, fixed top-right, hidden on auth routes and `/settings`
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

## Notifications System
- **Slide-down dropdown**: Bell icon in top-right bar (next to gear icon) opens a dropdown overlay. No separate page — data fetched on dropdown open via `getNotifications()` server action.
- **Unread badge**: Red count badge on bell icon, fetched on mount via `getUnreadCount()`. Refreshes on pathname change.
- **Notification types**: `new_post` (pen icon), `new_comment` (chat icon), `new_like` (heart icon), `new_mention` (@ icon). Extensible — add new types without migrations.
- **Anonymity-aware**: `actor_handle` is NULL for anonymous actions. Dropdown shows "Someone" when NULL, `@handle` when revealed.
- **Mark as read**: Click notification → marks read + navigates to `/post/[id]`. "Mark all as read" button in dropdown header.
- **Fire-and-forget inserts**: Notification inserts in `createPost`, `createComment`, and `toggleLike` are wrapped in try/catch. Failures are silently ignored — never block the primary action.
- **Self-notification prevention**: No notification sent when the actor is the same as the recipient (e.g., commenting on own post).
- **Placeholder targets**: No notification sent for posts targeting placeholder profiles (no real user to notify).

## @Mention System
- **Autocomplete dropdown**: Typing `@` in a comment or post body opens a dropdown. In comments: "In this thread" section (Anon N, @handles of participants) + "All users" section (debounced global search via `searchMentionUsers`). In post body: global search only (no thread context).
- **Token format**: Mentions stored as `@[label](type:id)` in text. User mentions: `@[samuel](user:samuel)`. Anon mentions: `@[Anon 2](anon:2)`. Regex: `/@\[([^\]]+)\]\((\w+):([^)]+)\)/g`.
- **Dual-state text**: Comment composer and create form maintain two parallel strings: `displayBody` (what the textarea shows, e.g., `@Anon 2`) and `rawBody` (what gets stored, e.g., `@[Anon 2](anon:2)`). `displayToRawIndex()` maps cursor positions between them.
- **Styled rendering**: `MentionText` component parses raw text and renders mentions as clickable elements. User mentions: blue `<Link>` to `/profile/[handle]`. Anon mentions: violet `<button>` that scrolls to the anon's first comment via `data-anon-number` attribute.
- **Thread-local anon numbers**: `@anonN` mentions are only meaningful within the thread where they were created. The anon number maps to a specific anonymous user in that thread only.
- **Notification on mention**: Each `@mention` creates a `new_mention` notification (@ icon) for the mentioned user. `comment_id` stored on the notification for scroll-to-comment. Clicking navigates to `/post/{id}?comment={commentId}`.
- **Anon resolution**: Server-side `createComment` rebuilds the anonMap (via `buildAnonMap()` + `invertAnonMap()` from `src/lib/mentions.ts`) to resolve `@anonN` to real user IDs for notifications.
- **Label convention**: Labels never include `@` prefix — the `@` is added only at display time (dropdown UI, textarea insertion, MentionText render). This prevents `@@handle` double-prefix bugs.
- **Multiple mentions**: A single comment/post can mention multiple people. Each gets a separate notification. Self-mentions silently ignored.
- **Scroll-to-comment**: `ScrollToComment` client component reads `?comment=` URL param and scrolls the target comment into view. Comment list elements have `id="comment-{id}"` and `data-anon-number={N}` attributes.
- **Shared anonMap logic**: `buildAnonMap()` in `src/lib/mentions.ts` extracted from the thread page's anonymous numbering logic. Used by both thread page (render) and `createComment` (notification resolution) to ensure consistency.

## What's Next
The spec document is at `Spill_Project_Description.txt`. Remaining features may include: user profile editing, admin panel, and further polish.

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
- Email notifications: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_BASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional (for future use): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Key Patterns & Gotchas
- **Supabase joins**: use foreign key syntax like `author:users!posts_author_user_id_fkey(handle, display_name)` — cast result with `as unknown as { handle: string; ... } | null`
- **Nullable expires_at**: always null-guard before `new Date(expires_at)` — `new Date(null)` returns epoch (1970), not an error
- **Feed/profile expiration filter**: use `.or("expires_at.is.null,expires_at.gt.${now}")` — never `.gt("expires_at", now)` alone (hides permanent posts)
- **Server actions in thread**: `boundCreateComment` wraps `createComment` with post ID closure via `"use server"` inline
- **Anonymous numbering**: built server-side in thread page, only anonymous participants get numbers, stripped from client via SafeComment type
- **Client components needing server data**: use server actions called in useEffect (e.g., `getCurrentUserHandle` in create form)
- **Avatar privacy**: anonymous posts/comments must never expose the real avatar. Two layers: (1) `Avatar` component ignores `src` when `isAnonymous=true`, (2) SafeComment sets `avatarUrl: null` when `is_anonymous=true` server-side
- **Avatar uploads**: client-side compression via `compressImage()` (800x800 JPEG), then upload to Supabase Storage at `{userId}/avatar.jpg`. Server action saves public URL to `users.avatar_url`. Cache-busting `?t=timestamp` appended after upload. Accepts up to 10MB input; compressed output always under 2MB.
- **Supabase Storage bucket**: `avatars` (public, 2MB limit, JPEG/PNG/WebP only). RLS: users can upload/update/delete their own folder, public read.
- **Notifications**: Denormalized `actor_handle` + `post_subject` on each notification row avoids joins at render time. `actor_handle` is NULL when the triggering action was anonymous. No CHECK constraint on `type` column — new notification types don't require a migration. Fire-and-forget inserts wrapped in try/catch in server actions.
- **Dual-target posts**: Post queries must join on both `target:users!posts_target_user_id_fkey(...)` and `target_placeholder:placeholder_profiles!posts_target_placeholder_id_fkey(handle)`. Use `target?.handle ?? targetPlaceholder?.handle ?? "unknown"` to resolve the display handle.
- **Phone normalization**: Always use `normalizePhone()` from `src/lib/phone.ts` before storing or comparing phone numbers. All phones stored in E.164 format.
- **Placeholder XOR constraint**: When inserting posts, explicitly set the unused target to `null` (e.g., `target_user_id: null` for placeholder posts). The CHECK constraint requires exactly one non-null target.
- **Post media uploads**: Eager upload during form editing (before submit) via `useMediaUpload` hook. Files go to `post-media` bucket at `{userId}/{tempPostId}/{order}_{uuid}.{ext}`. Media metadata (URLs, paths) sent as JSON in FormData on submit, then inserted into `post_media` table server-side.
- **Post media queries**: Add `post_media(id, public_url, media_type, thumbnail_url, display_order, width, height)` to any `.select()` on posts. Sort by `display_order` in JS. Map snake_case DB columns to camelCase `MediaItem` type.
- **media_count on post INSERT**: Must pass `media_count` explicitly when inserting a post with media. The trigger on `post_media` fires after the media rows are inserted, but the `posts_content_required` CHECK constraint fires at post insert time.
- **Nullable subject/body**: Posts with media can have null subject and/or body. PostCard conditionally renders them. Always use `subject || null` (not empty string) when inserting.
- **Moderation hook**: `post_media.moderation_status` defaults to `'pending'`. Commented hook point in `createPost` server action marks where Google Vision API check should be added. Future implementation should update status to `'approved'` or `'rejected'` per media file.
- **Profile navigation**: Bottom nav links directly to `/profile/[handle]` (not `/profile`). The `/profile/page.tsx` fallback is a `"use client"` component using `router.replace()` + `getCurrentUserHandle()` server action — never use server-side `redirect()` in page components, as it causes "Rendered more hooks" errors in the Next.js App Router during client-side navigation. After onboarding, the root layout may cache `userHandle` as `null` (shared layouts don't re-render on soft navigation), so this fallback must be safe.
- **No server-side `redirect()` in page components**: All `redirect()` calls must be in `"use server"` files (server actions) only. Server component `redirect()` during client-side navigation causes the Next.js Router's internal `useMemo` hooks to desync. Use `router.replace()` in client components instead.
- **Mention token format**: `@[label](type:id)` where type is `user` (handle) or `anon` (thread-local number). Regex: `/@\[([^\]]+)\]\((\w+):([^)]+)\)/g`. Parse with `parseMentions()` from `src/lib/mentions.ts`.
- **Mention dual-state text**: Comment composer and create form maintain `displayBody` (shown in textarea) and `rawBody` (with tokens). `displayToRawIndex()` maps cursor positions between the two. On submit, `rawBody` is sent to server.
- **Mention anon resolution**: Server-side `createComment` rebuilds the anonMap (via `buildAnonMap()`) to resolve `@anonN` mentions to real user IDs for notifications. Uses `invertAnonMap()` for number→userId lookup.
- **Mention notifications**: `new_mention` type with `comment_id` column (nullable). Clicking navigates to `/post/{id}?comment={commentId}`. `ScrollToComment` component reads the param and scrolls.
- **Anonymous numbering shared logic**: `buildAnonMap()` in `src/lib/mentions.ts` is used by both the thread page (render) and `createComment` (notification resolution). Same algorithm ensures consistency.
- **Email notifications**: Fire-and-forget `sendNotificationEmail()` calls in server actions, same pattern as in-app notifications. Resend client lazily initialized to avoid build errors when env var is missing. 2-hour cooldown tracked via `last_email_sent_at` on users table. Anonymous comments skip email (`actorHandle === null` check). Digest emails batch unread notifications when cooldown has passed. Unsubscribe route at `/api/unsubscribe` uses service-role Supabase client to bypass RLS. Unsubscribe + settings routes added to `publicRoutes` in proxy.ts.
- **SMS invite prompt**: `createPost` returns success data (not `redirect()`) for placeholder posts so the client can redirect to `/create/success`. Real user posts still use server-side `redirect("/")`. The `sms:` URI uses `?&body=` format for cross-platform compatibility (iOS + Android). Phone number fetched via `getPlaceholderSmsData` server action, used only in `sms:` href, never displayed. `recordSmsPrompt` updates `last_sms_prompted_at` and inserts referral row — fire-and-forget on "Send Text" click. Referral linking happens in both onboarding (`completeOnboarding`) and settings (`updatePhoneNumber`) via `linkReferral()`. Referrer ID stored in localStorage at `/invite`, read back in onboarding form as hidden field.
