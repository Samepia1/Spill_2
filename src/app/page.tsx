import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post-card";
import FeedTabs from "@/components/feed-tabs";
import type { MediaItem } from "@/components/media-carousel";

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

  // Fetch active posts (non-expired or no expiration set)
  const now = new Date().toISOString();
  let query = supabase
    .from("posts")
    .select(
      "id, subject, body, target_user_id, is_anonymous, expires_at, like_count, comment_count, created_at, target:users!posts_target_user_id_fkey(handle, display_name, avatar_url), author:users!posts_author_user_id_fkey(handle, display_name, avatar_url), target_placeholder:placeholder_profiles!posts_target_placeholder_id_fkey(handle), post_media(id, public_url, media_type, thumbnail_url, display_order, width, height)"
    )
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  // Apply sort based on tab
  if (activeTab === "new") {
    query = query.order("created_at", { ascending: false });
  } else if (activeTab === "ending") {
    // Only show posts that have an expiration set
    query = query.not("expires_at", "is", null).order("expires_at", { ascending: true });
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
              avatar_url: string | null;
            } | null;
            const author = post.author as unknown as {
              handle: string;
              display_name: string | null;
              avatar_url: string | null;
            } | null;
            const targetPlaceholder = post.target_placeholder as unknown as { handle: string } | null;
            const targetHandle = target?.handle ?? targetPlaceholder?.handle ?? "unknown";
            const targetIsPlaceholder = !target && !!targetPlaceholder;
            const media = ((post.post_media as unknown as MediaItem[]) ?? [])
              .sort((a, b) => (a as unknown as { display_order: number }).display_order - (b as unknown as { display_order: number }).display_order)
              .map((m: unknown) => {
                const item = m as { id: string; public_url: string; media_type: "image" | "video"; thumbnail_url: string | null; display_order: number; width: number | null; height: number | null };
                return {
                  id: item.id,
                  publicUrl: item.public_url,
                  mediaType: item.media_type,
                  thumbnailUrl: item.thumbnail_url,
                  width: item.width,
                  height: item.height,
                };
              });
            return (
              <PostCard
                key={post.id}
                id={post.id}
                subject={post.subject}
                body={post.body}
                targetHandle={targetHandle}
                targetDisplayName={target?.display_name ?? null}
                targetIsPlaceholder={targetIsPlaceholder}
                isAnonymous={post.is_anonymous}
                authorHandle={author?.handle ?? null}
                authorDisplayName={author?.display_name ?? null}
                authorAvatarUrl={author?.avatar_url ?? null}
                targetAvatarUrl={target?.avatar_url ?? null}
                expiresAt={post.expires_at}
                likeCount={post.like_count}
                commentCount={post.comment_count}
                createdAt={post.created_at}
                userHasLiked={userLikedPostIds.has(post.id)}
                media={media}
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
