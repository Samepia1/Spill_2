import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import PostCard from "@/components/post-card";

type SortValue = "top" | "newest" | "comments" | "ending";

const sortTabs: { label: string; value: SortValue }[] = [
  { label: "Top", value: "top" },
  { label: "Newest", value: "newest" },
  { label: "Most Comments", value: "comments" },
  { label: "Ending Soon", value: "ending" },
];

export default async function ProfileHandlePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();

  // Look up the profile user by handle
  const { data: profileUser } = await supabase
    .from("users")
    .select("id, handle, display_name")
    .eq("handle", handle)
    .single();

  if (!profileUser) {
    notFound();
  }

  const { sort } = await searchParams;
  const activeSort: SortValue =
    sort === "top" || sort === "newest" || sort === "comments" || sort === "ending"
      ? sort
      : "newest";

  // Fetch active, non-expired posts targeting this user
  let query = supabase
    .from("posts")
    .select(
      "id, subject, body, expires_at, like_count, comment_count, created_at, target:users!posts_target_user_id_fkey(handle, display_name)"
    )
    .eq("target_user_id", profileUser.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (activeSort === "top") {
    query = query.order("like_count", { ascending: false });
  } else if (activeSort === "comments") {
    query = query.order("comment_count", { ascending: false });
  } else if (activeSort === "ending") {
    query = query.order("expires_at", { ascending: true });
  } else {
    // newest (default)
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(50);

  const { data: posts } = await query;

  // Get current user to check liked posts and ownership
  const currentUser = await getCurrentUser();

  const postIds = posts?.map((p) => p.id) ?? [];
  let userLikedPostIds = new Set<string>();
  if (currentUser && postIds.length > 0) {
    const { data: likes } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", currentUser.userId)
      .in("post_id", postIds);
    userLikedPostIds = new Set(likes?.map((l) => l.post_id) ?? []);
  }

  const isOwnProfile = currentUser?.profile.id === profileUser.id;

  return (
    <div className="mx-auto max-w-lg">
      {/* Profile header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          @{profileUser.handle}
        </h1>
        {profileUser.display_name && (
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            {profileUser.display_name}
          </p>
        )}
        {!isOwnProfile && (
          <Link
            href={`/create?target=${profileUser.handle}`}
            className="mt-3 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create a post about @{profileUser.handle}
          </Link>
        )}
      </header>

      {/* Sort tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-1 px-4">
          {sortTabs.map((tab) => {
            const isActive = activeSort === tab.value;
            const href =
              tab.value === "newest"
                ? `/profile/${handle}`
                : `/profile/${handle}?sort=${tab.value}`;
            return (
              <Link
                key={tab.value}
                href={href}
                className={`relative px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? "font-semibold text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-100" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Posts list */}
      <div className="flex flex-col gap-3 p-4">
        {(posts ?? []).length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No posts about @{profileUser.handle} yet
          </p>
        ) : (
          (posts ?? []).map((post) => {
            const target = post.target as unknown as {
              handle: string;
              display_name: string | null;
            } | null;
            return (
              <PostCard
                key={post.id}
                id={post.id}
                subject={post.subject}
                body={post.body}
                targetHandle={target?.handle ?? "unknown"}
                targetDisplayName={target?.display_name ?? null}
                expiresAt={post.expires_at}
                likeCount={post.like_count}
                commentCount={post.comment_count}
                createdAt={post.created_at}
                userHasLiked={userLikedPostIds.has(post.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
