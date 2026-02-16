import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post-card";
import FeedTabs from "@/components/feed-tabs";

type TabValue = "trending" | "new" | "ending";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = (tab as TabValue) || "trending";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch active, non-expired posts with target user info
  let query = supabase
    .from("posts")
    .select(
      "id, subject, body, target_user_id, expires_at, like_count, comment_count, created_at, target:users!posts_target_user_id_fkey(handle, display_name)"
    )
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  // Apply sort based on tab
  if (activeTab === "new") {
    query = query.order("created_at", { ascending: false });
  } else if (activeTab === "ending") {
    query = query.order("expires_at", { ascending: true });
  } else {
    // Trending: fetch all and sort client-side with decay formula
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(50);

  const { data: posts } = await query;

  // Get user's likes for these posts
  const postIds = posts?.map((p) => p.id) ?? [];
  let userLikedPostIds = new Set<string>();
  if (user && postIds.length > 0) {
    const { data: likes } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds);
    userLikedPostIds = new Set(likes?.map((l) => l.post_id) ?? []);
  }

  // Sort by trending score if trending tab
  let sortedPosts = posts ?? [];
  if (activeTab === "trending") {
    sortedPosts = [...sortedPosts].sort((a, b) => {
      const scoreA = trendingScore(a);
      const scoreB = trendingScore(b);
      return scoreB - scoreA;
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Spill
        </h1>
      </header>

      <FeedTabs />

      <div className="flex flex-col gap-3 p-4">
        {sortedPosts.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No posts yet. Be the first to spill.
          </p>
        ) : (
          sortedPosts.map((post) => {
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

/** Computes a trending score: (likes + comments * 0.3) * exp(-age_hours / 24) */
function trendingScore(post: {
  like_count: number;
  comment_count: number;
  created_at: string;
}): number {
  const ageHours =
    (Date.now() - new Date(post.created_at).getTime()) / 3600000;
  const decay = Math.exp(-ageHours / 24);
  return (post.like_count * 1.0 + post.comment_count * 0.3) * decay;
}
