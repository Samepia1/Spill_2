"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createPost(formData: FormData) {
  const targetHandle = formData.get("targetHandle") as string;
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;

  const supabase = await createClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // 2. Get current user's profile
  const { data: profile } = await supabase
    .from("users")
    .select("id, university_id, status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  // 3. Check if suspended
  if (profile.status === "suspended") {
    return { error: "Your account is suspended" };
  }

  // 4. Validate subject
  const trimmedSubject = subject?.trim() ?? "";
  if (trimmedSubject.length < 1 || trimmedSubject.length > 200) {
    return { error: "Subject must be between 1 and 200 characters" };
  }

  // 5. Validate body
  const trimmedBody = body?.trim() ?? "";
  if (trimmedBody.length < 1 || trimmedBody.length > 1000) {
    return { error: "Body must be between 1 and 1000 characters" };
  }

  // 6. Look up target user by handle
  if (!targetHandle) {
    return { error: "Target handle is required" };
  }

  const { data: target } = await supabase
    .from("users")
    .select("id, university_id")
    .eq("handle", targetHandle)
    .single();

  if (!target) {
    return { error: "Target user not found" };
  }

  // 7. Check same university
  if (target.university_id !== profile.university_id) {
    return { error: "Target must be at your university" };
  }

  // 8. Check not self
  if (target.id === user.id) {
    return { error: "You can't create a post about yourself" };
  }

  // 9. Check for recent post about this target (30-minute cooldown per author-target pair)
  const thirtyMinutesAgo = new Date(
    Date.now() - 30 * 60 * 1000
  ).toISOString();

  const { data: recentPost } = await supabase
    .from("posts")
    .select("id")
    .eq("author_user_id", user.id)
    .eq("target_user_id", target.id)
    .gte("created_at", thirtyMinutesAgo)
    .limit(1)
    .maybeSingle();

  if (recentPost) {
    return { error: "You can only post about this person once every 30 minutes" };
  }

  // 10. Check daily rate limit (3 posts per 24 hours)
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const { count } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("author_user_id", user.id)
    .gte("created_at", twentyFourHoursAgo);

  if (count !== null && count >= 3) {
    return { error: "You can only create 3 posts per day" };
  }

  // 11. Calculate expiry (48 hours from now)
  const expires_at = new Date(
    Date.now() + 48 * 60 * 60 * 1000
  ).toISOString();

  // 12. Insert the post
  const { error: insertError } = await supabase.from("posts").insert({
    university_id: profile.university_id,
    author_user_id: user.id,
    target_user_id: target.id,
    subject: trimmedSubject,
    body: trimmedBody,
    expires_at,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  redirect("/");
}

export async function searchTargetUsers(query: string): Promise<
  | {
      data: Array<{
        id: string;
        handle: string;
        display_name: string | null;
      }>;
    }
  | { error: string }
> {
  if (!query || query.length < 1) {
    return { data: [] };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, handle, display_name")
    .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(10);

  if (error) {
    return { error: error.message };
  }

  return { data: data ?? [] };
}
