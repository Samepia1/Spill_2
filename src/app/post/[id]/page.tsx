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

  // Fetch the post with target and author user info
  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, subject, body, author_user_id, target_user_id, university_id, is_anonymous, expires_at, like_count, comment_count, created_at, status, target:users!posts_target_user_id_fkey(handle, display_name), author:users!posts_author_user_id_fkey(handle, display_name)"
    )
    .eq("id", id)
    .single();

  if (!post) notFound();

  const target = post.target as unknown as {
    handle: string;
    display_name: string | null;
  } | null;
  const postAuthor = post.author as unknown as {
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
    .select("id, body, author_user_id, created_at, status, is_anonymous, author:users!comments_author_user_id_fkey(handle, display_name)")
    .eq("post_id", post.id)
    .order("created_at", { ascending: true });

  // Build anonymous identity map (only for anonymous participants)
  const anonMap = new Map<string, number>();
  let anonCounter = 1;

  // If OP posted anonymously, reserve Anon 1 for them
  if (post.is_anonymous) {
    anonMap.set(post.author_user_id, anonCounter++);
  }

  // Assign anon numbers to anonymous commenters
  for (const comment of comments ?? []) {
    if (comment.is_anonymous && !anonMap.has(comment.author_user_id)) {
      anonMap.set(comment.author_user_id, anonCounter++);
    }
  }

  // Determine current user's existing identity choice in this thread
  const currentUserComment = (comments ?? []).find(
    (c) => c.author_user_id === user.id
  );
  const hasChosenIdentity = !!currentUserComment;
  const chosenIsAnonymous = currentUserComment?.is_anonymous ?? null;

  // Get current user's handle for the composer
  const { data: currentUserProfile } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .single();

  // Determine identity mode for composer
  let identityMode: "anonymous" | "revealed" | "choose" = "choose";
  if (hasChosenIdentity) {
    identityMode = chosenIsAnonymous ? "anonymous" : "revealed";
  }

  const currentUserAnonNumber = anonMap.get(user.id) ?? null;

  // Transform to safe comments (strip user IDs)
  const safeComments: SafeComment[] = (comments ?? []).map((c) => {
    const commentAuthor = c.author as unknown as {
      handle: string;
      display_name: string | null;
    } | null;
    return {
      id: c.id,
      body: c.body,
      createdAt: c.created_at,
      isAnonymous: c.is_anonymous,
      anonNumber: c.is_anonymous ? (anonMap.get(c.author_user_id) ?? 0) : null,
      handle: c.is_anonymous ? null : (commentAuthor?.handle ?? null),
      displayName: c.is_anonymous ? null : (commentAuthor?.display_name ?? null),
      isCurrentUser: c.author_user_id === user.id,
      isOp: c.author_user_id === post.author_user_id,
      status: c.status,
    };
  });

  // Bind the server action with postId
  async function boundCreateComment(
    body: string,
    isAnonymous: boolean
  ): Promise<{ error?: string; success?: boolean }> {
    "use server";
    return createComment(id, body, isAnonymous);
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
          isAnonymous={post.is_anonymous}
          authorHandle={postAuthor?.handle ?? null}
          authorDisplayName={postAuthor?.display_name ?? null}
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
          identityMode={identityMode}
          userHandle={currentUserProfile?.handle ?? ""}
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
