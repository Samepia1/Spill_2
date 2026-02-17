"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createReport(
  entityType: "post" | "comment" | "user",
  entityId: string,
  reason: string,
  details?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get current user profile
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

  // Rate limit: max 10 reports per day
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("reporter_user_id", user.id)
    .gte("created_at", oneDayAgo);

  if (count !== null && count >= 10) {
    return { error: "Too many reports today. Try again tomorrow." };
  }

  // Validate entity exists, same university, not own content
  if (entityType === "post") {
    const { data: post } = await supabase
      .from("posts")
      .select("id, author_user_id, university_id")
      .eq("id", entityId)
      .single();

    if (!post || post.university_id !== profile.university_id) {
      return { error: "Post not found" };
    }

    if (post.author_user_id === user.id) {
      return { error: "You cannot report your own content" };
    }
  } else if (entityType === "comment") {
    const { data: comment } = await supabase
      .from("comments")
      .select("id, author_user_id, university_id")
      .eq("id", entityId)
      .single();

    if (!comment || comment.university_id !== profile.university_id) {
      return { error: "Comment not found" };
    }

    if (comment.author_user_id === user.id) {
      return { error: "You cannot report your own content" };
    }
  } else if (entityType === "user") {
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, university_id")
      .eq("id", entityId)
      .single();

    if (!targetUser || targetUser.university_id !== profile.university_id) {
      return { error: "User not found" };
    }

    if (targetUser.id === user.id) {
      return { error: "You cannot report yourself" };
    }
  }

  // Insert report
  const { error: insertError } = await supabase.from("reports").insert({
    reporter_user_id: user.id,
    entity_type: entityType,
    entity_id: entityId,
    reason,
    details: details?.trim() || null,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/mod");
  return { success: true };
}
