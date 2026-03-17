"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotificationEmail } from "@/lib/email";
import {
  extractMentionedHandles,
  extractMentionedAnonNumbers,
  buildAnonMap,
  invertAnonMap,
  displayLength,
} from "@/lib/mentions";

export async function createComment(postId: string, body: string, isAnonymous: boolean = true) {
  const trimmed = body?.trim() ?? "";

  // Validate using display length (raw tokens are longer than what user sees)
  const visibleLength = displayLength(trimmed);
  if (visibleLength < 1 || visibleLength > 300) {
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
    .select("id, university_id, status, handle")
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
    .select("id, university_id, status, expires_at, author_user_id, subject, is_anonymous")
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

  if (post.expires_at && new Date(post.expires_at) <= new Date()) {
    return { error: "This post has expired" };
  }

  // Enforce identity consistency: if user has previous comments, must match
  const { data: existingComment } = await supabase
    .from("comments")
    .select("is_anonymous")
    .eq("post_id", postId)
    .eq("author_user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingComment && existingComment.is_anonymous !== isAnonymous) {
    return { error: "You cannot change your identity mode in this thread" };
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

  // Insert comment — capture the new comment's ID for mention notifications
  const { data: newComment, error: insertError } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      university_id: profile.university_id,
      author_user_id: user.id,
      body: trimmed,
      is_anonymous: isAnonymous,
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: insertError.message };
  }

  // Notify post author if commenter is not the author
  if (post.author_user_id !== user.id) {
    try {
      await supabase.from("notifications").insert({
        university_id: profile.university_id,
        recipient_id: post.author_user_id,
        actor_id: user.id,
        type: "new_comment",
        post_id: postId,
        actor_handle: isAnonymous ? null : profile.handle,
        post_subject: post.subject || "(media post)",
      });
      // Only email for revealed comments (not anonymous)
      if (!isAnonymous) {
        sendNotificationEmail(post.author_user_id, "new_comment", postId, profile.handle).catch(() => {});
      }
    } catch {
      // Fire-and-forget
    }
  }

  // Send mention notifications
  try {
    const mentionedHandles = extractMentionedHandles(trimmed);
    const mentionedAnonNumbers = extractMentionedAnonNumbers(trimmed);

    if (mentionedHandles.length > 0 || mentionedAnonNumbers.length > 0) {
      const recipientIds = new Set<string>();

      // Resolve @handle mentions to user IDs
      if (mentionedHandles.length > 0) {
        const { data: mentionedUsers } = await supabase
          .from("users")
          .select("id, handle")
          .in("handle", mentionedHandles)
          .eq("university_id", profile.university_id);

        for (const u of mentionedUsers ?? []) {
          if (u.id !== user.id) {
            recipientIds.add(u.id);
          }
        }
      }

      // Resolve @anonN mentions to user IDs via anonMap
      if (mentionedAnonNumbers.length > 0) {
        // Fetch all comments for this post to rebuild the anonMap
        const { data: allComments } = await supabase
          .from("comments")
          .select("author_user_id, is_anonymous")
          .eq("post_id", postId)
          .order("created_at", { ascending: true });

        const anonMap = buildAnonMap(
          post.author_user_id,
          post.is_anonymous,
          allComments ?? []
        );
        const inverted = invertAnonMap(anonMap);

        for (const num of mentionedAnonNumbers) {
          const userId = inverted.get(num);
          if (userId && userId !== user.id) {
            recipientIds.add(userId);
          }
        }
      }

      // Insert a notification for each mentioned user
      for (const recipientId of recipientIds) {
        await supabase.from("notifications").insert({
          university_id: profile.university_id,
          recipient_id: recipientId,
          actor_id: user.id,
          type: "new_mention",
          post_id: postId,
          comment_id: newComment.id,
          actor_handle: isAnonymous ? null : profile.handle,
          post_subject: post.subject || "(media post)",
        });
        sendNotificationEmail(recipientId, "new_mention", postId, isAnonymous ? null : profile.handle).catch(() => {});
      }
    }
  } catch {
    // Fire-and-forget — mention notifications should never block the comment
  }

  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
  return { success: true };
}
