"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Toggles a like on a post for the current user.
 * Inserts a like if one doesn't exist, deletes it if it does.
 *
 * Note: This does NOT update the denormalized `like_count` on the posts table
 * because regular users lack an UPDATE RLS policy on posts. The feed should
 * count likes from the `likes` table directly, or a database trigger should
 * be added to keep `like_count` in sync.
 */
export async function toggleLike(postId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if the user already liked this post
  const { data: existingLike, error: selectError } = await supabase
    .from("likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    return { error: selectError.message };
  }

  if (existingLike) {
    // Unlike: remove the existing like
    const { error: deleteError } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (deleteError) {
      return { error: deleteError.message };
    }

    revalidatePath("/");
    return { liked: false };
  }

  // Like: insert a new like
  const { error: insertError } = await supabase
    .from("likes")
    .insert({ post_id: postId, user_id: user.id });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/");
  return { liked: true };
}
