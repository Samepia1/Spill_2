import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { timeRemaining } from "@/lib/time";
import PostCard from "@/components/post-card";
import CommentList, { type SafeComment } from "@/components/comment-list";
import CommentComposer from "@/components/comment-composer";
import { createComment } from "./actions";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // Fetch the post with target user info
  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, subject, body, author_user_id, target_user_id, university_id, expires_at, like_count, comment_count, created_at, status, target:users!posts_target_user_id_fkey(handle, display_name)"
    )
    .eq("id", id)
    .single();

  if (!post) notFound();

  const target = post.target as unknown as {
    handle: string;
    display_name: string | null;
  } | null;

  const remaining = timeRemaining(post.expires_at);
  const isExpired = remaining === "Expired";
  const isActive = post.status === "active" && !isExpired;

  // Check if current user has liked this post
  const { data: existingLike } = await supabase
    .from("likes")
    .select("post_id")
    .eq("post_id", post.id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Fetch all comments for this post, chronological order
  const { data: comments } = await supabase
    .from("comments")
    .select("id, body, author_user_id, created_at")
    .eq("post_id", post.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  // Build anonymous identity map
  const anonMap = new Map<string, number>();
  let counter = 1;
  anonMap.set(post.author_user_id, counter++); // OP is always Anon 1

  for (const comment of comments ?? []) {
    if (!anonMap.has(comment.author_user_id)) {
      anonMap.set(comment.author_user_id, counter++);
    }
  }

  // Transform to safe comments (strip user IDs)
  const safeComments: SafeComment[] = (comments ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    anonNumber: anonMap.get(c.author_user_id) ?? 0,
    isCurrentUser: c.author_user_id === user.id,
  }));

  const currentUserAnonNumber = anonMap.get(user.id) ?? null;

  // Bind the server action with postId
  async function boundCreateComment(
    body: string
  ): Promise<{ error?: string; success?: boolean }> {
    "use server";
    return createComment(id, body);
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <BackIcon />
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Thread
        </h1>
      </header>

      {/* Post */}
      <div className="px-4 pb-2">
        <PostCard
          id={post.id}
          subject={post.subject}
          body={post.body}
          targetHandle={target?.handle ?? "unknown"}
          targetDisplayName={target?.display_name ?? null}
          expiresAt={post.expires_at}
          likeCount={post.like_count}
          commentCount={post.comment_count}
          createdAt={post.created_at}
          userHasLiked={!!existingLike}
        />
      </div>

      {/* Expired/removed banner */}
      {!isActive && (
        <div className="mx-4 mb-3 rounded-lg bg-zinc-100 px-4 py-3 text-center text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {post.status === "removed"
            ? "This post has been removed."
            : "This topic has expired."}
        </div>
      )}

      {/* Comments */}
      <div className="px-4 pb-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Comments ({safeComments.length})
        </h2>
        <CommentList comments={safeComments} />
      </div>

      {/* Composer (only if post is active) */}
      {isActive && (
        <CommentComposer
          action={boundCreateComment}
          currentUserAnonNumber={currentUserAnonNumber}
        />
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
