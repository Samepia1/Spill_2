"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createComment(postId: string, body: string) {
  const trimmed = body?.trim() ?? "";

  if (trimmed.length < 1 || trimmed.length > 300) {
    return { error: "Comment must be between 1 and 300 characters" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get current user's profile
  const { data: profile } = await supabase
    .from("users")
    .select("id, university_id, status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  if (profile.status === "suspended") {
    return { error: "Your account is suspended" };
  }

  // Fetch the post — must exist, be active, not expired, same university
  const { data: post } = await supabase
    .from("posts")
    .select("id, university_id, status, expires_at")
    .eq("id", postId)
    .single();

  if (!post) {
    return { error: "Post not found" };
  }

  if (post.university_id !== profile.university_id) {
    return { error: "Post not found" };
  }

  if (post.status !== "active") {
    return { error: "This post has been removed" };
  }

  if (new Date(post.expires_at) <= new Date()) {
    return { error: "This post has expired" };
  }

  // Rate limit: max 10 comments per post per user per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("author_user_id", user.id)
    .gte("created_at", oneHourAgo);

  if (count !== null && count >= 10) {
    return { error: "Too many comments. Try again later." };
  }

  // Insert comment
  const { error: insertError } = await supabase.from("comments").insert({
    post_id: postId,
    university_id: profile.university_id,
    author_user_id: user.id,
    body: trimmed,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
  return { success: true };
}
