"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function verifyModerator() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" as const, supabase: null, user: null };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, university_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "moderator" && profile.role !== "admin")) {
    return { error: "Unauthorized" as const, supabase: null, user: null };
  }

  return { error: null, supabase, user: profile };
}

export async function removePost(
  postId: string,
  reportId: string,
  reason: string
) {
  const { error, supabase, user } = await verifyModerator();
  if (error || !supabase || !user) return { error: error ?? "Unauthorized" };

  // Update post status
  const { error: updateError } = await supabase
    .from("posts")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
      removed_by: user.id,
      removal_reason: reason,
    })
    .eq("id", postId)
    .eq("university_id", user.university_id);

  if (updateError) return { error: updateError.message };

  // Log moderation action
  await supabase.from("moderation_actions").insert({
    moderator_user_id: user.id,
    action_type: "remove_post",
    entity_type: "post",
    entity_id: postId,
    reason,
  });

  // Update report status
  await supabase
    .from("reports")
    .update({ status: "reviewed" })
    .eq("id", reportId);

  revalidatePath("/mod");
  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  return { success: true };
}

export async function removeComment(
  commentId: string,
  reportId: string,
  reason: string
) {
  const { error, supabase, user } = await verifyModerator();
  if (error || !supabase || !user) return { error: error ?? "Unauthorized" };

  // Update comment status
  const { error: updateError } = await supabase
    .from("comments")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
      removed_by: user.id,
      removal_reason: reason,
    })
    .eq("id", commentId)
    .eq("university_id", user.university_id);

  if (updateError) return { error: updateError.message };

  // Log moderation action
  await supabase.from("moderation_actions").insert({
    moderator_user_id: user.id,
    action_type: "remove_comment",
    entity_type: "comment",
    entity_id: commentId,
    reason,
  });

  // Update report status
  await supabase
    .from("reports")
    .update({ status: "reviewed" })
    .eq("id", reportId);

  revalidatePath("/mod");
  return { success: true };
}

export async function suspendUser(
  userId: string,
  reportId: string,
  reason: string
) {
  const { error, supabase, user } = await verifyModerator();
  if (error || !supabase || !user) return { error: error ?? "Unauthorized" };

  // Cannot suspend other moderators or admins
  const { data: targetUser } = await supabase
    .from("users")
    .select("id, role, university_id")
    .eq("id", userId)
    .single();

  if (!targetUser || targetUser.university_id !== user.university_id) {
    return { error: "User not found" };
  }

  if (targetUser.role === "moderator" || targetUser.role === "admin") {
    return { error: "Cannot suspend moderators or admins" };
  }

  // Update user status
  const { error: updateError } = await supabase
    .from("users")
    .update({ status: "suspended" })
    .eq("id", userId)
    .eq("university_id", user.university_id);

  if (updateError) return { error: updateError.message };

  // Log moderation action
  await supabase.from("moderation_actions").insert({
    moderator_user_id: user.id,
    action_type: "suspend_user",
    entity_type: "user",
    entity_id: userId,
    reason,
  });

  // Update report status
  await supabase
    .from("reports")
    .update({ status: "reviewed" })
    .eq("id", reportId);

  revalidatePath("/mod");
  return { success: true };
}

export async function dismissReport(reportId: string) {
  const { error, supabase, user } = await verifyModerator();
  if (error || !supabase || !user) return { error: error ?? "Unauthorized" };

  const { error: updateError } = await supabase
    .from("reports")
    .update({ status: "dismissed" })
    .eq("id", reportId);

  if (updateError) return { error: updateError.message };

  // Log moderation action
  await supabase.from("moderation_actions").insert({
    moderator_user_id: user.id,
    action_type: "dismiss_report",
    entity_type: "report",
    entity_id: reportId,
    reason: "Dismissed by moderator",
  });

  revalidatePath("/mod");
  return { success: true };
}
