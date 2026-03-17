"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateAvatarUrl(avatarUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, handle, avatar_url, phone_number, email_notify_posts, email_notify_comments, email_notify_mentions")
    .eq("id", user.id)
    .single();

  return data;
}

export async function updatePhoneNumber(
  phone: string
): Promise<{ success?: boolean; mergedCount?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const normalized = normalizePhone(phone);
  if (!normalized) return { error: "Invalid phone number format" };

  // Get user's university_id
  const { data: profile } = await supabase
    .from("users")
    .select("university_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "User profile not found" };

  // Update phone number
  const { error: updateError } = await supabase
    .from("users")
    .update({ phone_number: normalized })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  // Claim any placeholder profiles matching this phone number
  const { data: mergedCount } = await supabase.rpc(
    "claim_placeholder_profile",
    {
      p_phone_number: normalized,
      p_user_id: user.id,
      p_university_id: profile.university_id,
    }
  );

  return { success: true, mergedCount: mergedCount ?? 0 };
}

export async function updateEmailPreferences(prefs: {
  posts?: boolean;
  comments?: boolean;
  mentions?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const updates: Record<string, boolean> = {};
  if (prefs.posts !== undefined) updates.email_notify_posts = prefs.posts;
  if (prefs.comments !== undefined) updates.email_notify_comments = prefs.comments;
  if (prefs.mentions !== undefined) updates.email_notify_mentions = prefs.mentions;

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
