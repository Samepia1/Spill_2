import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import PostCard from "@/components/post-card";
import Avatar from "@/components/avatar";
import AvatarUpload from "@/components/avatar-upload";
import AvatarLightbox from "@/components/avatar-lightbox";
import ProfileSortTabs from "@/components/profile-sort-tabs";
import type { MediaItem } from "@/components/media-carousel";

type SortValue = "top" | "newest" | "comments" | "ending";

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
    .select("id, handle, display_name, avatar_url")
    .eq("handle", handle)
    .single();

  // If no real user found, try placeholder profiles
  let placeholder: { id: string; handle: string; phone_last_four: string | null; claimed_by: string | null } | null = null;
  if (!profileUser) {
    const { data: placeholderData } = await supabase
      .from("placeholder_profiles")
      .select("id, handle, phone_last_four, claimed_by")
      .eq("handle", handle)
      .is("claimed_by", null)
      .single();

    if (!placeholderData) notFound();
    placeholder = placeholderData;
  }

  const isPlaceholderProfile = !profileUser && !!placeholder;
  const targetId = isPlaceholderProfile ? placeholder!.id : profileUser!.id;
  const targetColumn = isPlaceholderProfile ? "target_placeholder_id" : "target_user_id";

  const { sort } = await searchParams;
  const activeSort: SortValue =
    sort === "top" || sort === "newest" || sort === "comments" || sort === "ending"
      ? sort
      : "newest";

  // Fetch active posts targeting this user (non-expired or no expiration)
  const now = new Date().toISOString();
  let query = supabase
    .from("posts")
    .select(
      "id, subject, body, is_anonymous, expires_at, like_count, comment_count, created_at, target:users!posts_target_user_id_fkey(handle, display_name, avatar_url), author:users!posts_author_user_id_fkey(handle, display_name, avatar_url), target_placeholder:placeholder_profiles!posts_target_placeholder_id_fkey(handle), post_media(id, public_url, media_type, thumbnail_url, display_order, width, height)"
    )
    .eq(targetColumn, targetId)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${now}`);

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

  const isOwnProfile = !isPlaceholderProfile && currentUser?.profile.id === profileUser?.id;
  const displayHandle = isPlaceholderProfile ? placeholder!.handle : profileUser!.handle;

  return (
    <div className="mx-auto max-w-lg">
      {/* Profile header */}
      <header className="px-4 pt-6 pb-4">
        {isPlaceholderProfile ? (
          <>
            <div className="mb-3">
              <Avatar src={null} alt={displayHandle} size="lg" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              @{displayHandle}
            </h1>
            <p className="mt-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              This person hasn&apos;t joined Spill yet
            </p>
          </>
        ) : (
          <>
            <div className="mb-3">
              {isOwnProfile ? (
                <AvatarUpload
                  userId={profileUser!.id}
                  currentAvatarUrl={profileUser!.avatar_url}
                  size="lg"
                />
              ) : (
                <AvatarLightbox
                  src={profileUser!.avatar_url}
                  alt={`@${profileUser!.handle}`}
                  size="lg"
                />
              )}
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              @{profileUser!.handle}
            </h1>
            {profileUser!.display_name && (
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                {profileUser!.display_name}
              </p>
            )}
            {!isOwnProfile && (
              <Link
                href={`/create?target=${profileUser!.handle}`}
                className="mt-3 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white transition-all duration-150 hover:bg-zinc-800 active:scale-[0.97] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Create a post about @{profileUser!.handle}
              </Link>
            )}
          </>
        )}
      </header>

      {/* Sort tabs */}
      <ProfileSortTabs handle={handle} />

      {/* Posts list */}
      <div className="flex flex-col gap-3 p-4">
        {(posts ?? []).length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No posts about @{displayHandle} yet
          </p>
        ) : (
          (posts ?? []).map((post) => {
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
            const postTargetIsPlaceholder = !target && !!targetPlaceholder;
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
                targetIsPlaceholder={postTargetIsPlaceholder}
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
