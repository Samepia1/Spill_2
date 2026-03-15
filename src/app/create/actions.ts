"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
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

  // 6. Check daily rate limit (3 posts per 24 hours)
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

  // 7. Calculate optional expiry
  const expiresInHours = formData.get("expiresInHours") as string | null;
  let expires_at: string | null = null;

  if (expiresInHours) {
    const hours = Number(expiresInHours);
    if (isNaN(hours) || hours < 1 || hours > 720) {
      return { error: "Expiration must be between 1 and 720 hours" };
    }
    expires_at = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }

  // 8. Determine anonymity
  const isAnonymous = formData.get("isAnonymous") !== "false";

  // 9. Handle target — either by handle (registered user) or phone number (placeholder)
  const targetPhoneNumber = formData.get("targetPhoneNumber") as string | null;

  if (targetPhoneNumber) {
    // --- Placeholder target path ---
    const normalized = normalizePhone(targetPhoneNumber);
    if (!normalized) return { error: "Invalid phone number" };

    // Check if phone belongs to registered user at same university
    const { data: registeredUser } = await supabase
      .from("users")
      .select("handle")
      .eq("phone_number", normalized)
      .eq("university_id", profile.university_id)
      .single();
    if (registeredUser) {
      return { error: `This person is already on Spill as @${registeredUser.handle}` };
    }

    // Find or create placeholder
    let placeholderId: string;

    const { data: existing } = await supabase
      .from("placeholder_profiles")
      .select("id")
      .eq("phone_number", normalized)
      .eq("university_id", profile.university_id)
      .is("claimed_by", null)
      .single();

    if (existing) {
      placeholderId = existing.id;
    } else {
      // Generate handle via RPC
      const lastFourDigits = normalized.slice(-4);
      const { data: generatedHandle } = await supabase.rpc(
        "generate_placeholder_handle",
        {
          p_phone_last_four: lastFourDigits,
          p_university_id: profile.university_id,
        }
      );

      // Insert new placeholder
      const { data: newPlaceholder, error: insertError } = await supabase
        .from("placeholder_profiles")
        .insert({
          phone_number: normalized,
          phone_last_four: lastFourDigits,
          handle: generatedHandle,
          university_id: profile.university_id,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertError) {
        // Handle race condition: another user created it simultaneously
        if (insertError.code === "23505") {
          const { data: raceExisting } = await supabase
            .from("placeholder_profiles")
            .select("id")
            .eq("phone_number", normalized)
            .eq("university_id", profile.university_id)
            .is("claimed_by", null)
            .single();
          if (raceExisting) {
            placeholderId = raceExisting.id;
          } else {
            return { error: "Failed to create placeholder profile" };
          }
        } else {
          return { error: "Failed to create placeholder profile" };
        }
      } else {
        placeholderId = newPlaceholder.id;
      }
    }

    // 30-minute cooldown per author-placeholder pair
    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000
    ).toISOString();

    const { data: recentPlaceholderPost } = await supabase
      .from("posts")
      .select("id")
      .eq("author_user_id", user.id)
      .eq("target_placeholder_id", placeholderId)
      .gte("created_at", thirtyMinutesAgo)
      .limit(1)
      .maybeSingle();

    if (recentPlaceholderPost) {
      return {
        error: "You can only post about this person once every 30 minutes",
      };
    }

    // Insert the post with placeholder target
    const { error: postError } = await supabase.from("posts").insert({
      university_id: profile.university_id,
      author_user_id: user.id,
      target_user_id: null,
      target_placeholder_id: placeholderId,
      subject: trimmedSubject,
      body: trimmedBody,
      is_anonymous: isAnonymous,
      ...(expires_at ? { expires_at } : {}),
    });

    if (postError) return { error: postError.message };
    redirect("/");
  }

  // --- Registered user target path ---

  // 10. Look up target user by handle
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

  // 11. Check same university
  if (target.university_id !== profile.university_id) {
    return { error: "Target must be at your university" };
  }

  // 12. Check not self
  if (target.id === user.id) {
    return { error: "You can't create a post about yourself" };
  }

  // 13. Check for recent post about this target (30-minute cooldown per author-target pair)
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
    return {
      error: "You can only post about this person once every 30 minutes",
    };
  }

  // 14. Insert the post
  const { error: insertError } = await supabase.from("posts").insert({
    university_id: profile.university_id,
    author_user_id: user.id,
    target_user_id: target.id,
    subject: trimmedSubject,
    body: trimmedBody,
    is_anonymous: isAnonymous,
    ...(expires_at ? { expires_at } : {}),
  });

  if (insertError) {
    return { error: insertError.message };
  }

  redirect("/");
}

export async function getCurrentUserHandle(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .single();

  return data?.handle ?? null;
}

export async function checkPhoneNumber(phone: string): Promise<
  | { existingUser: { handle: string } }
  | { existingPlaceholder: { id: string; handle: string } }
  | { available: true }
  | { error: string }
> {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const normalized = normalizePhone(phone);
  if (!normalized) return { error: "Invalid phone number format" };

  // Get current user's university_id
  const { data: profile } = await supabase
    .from("users")
    .select("university_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  // Check if phone belongs to a registered user at same university
  const { data: existingUser } = await supabase
    .from("users")
    .select("handle")
    .eq("phone_number", normalized)
    .eq("university_id", profile.university_id)
    .single();
  if (existingUser) return { existingUser: { handle: existingUser.handle } };

  // Check if unclaimed placeholder exists
  const { data: existingPlaceholder } = await supabase
    .from("placeholder_profiles")
    .select("id, handle")
    .eq("phone_number", normalized)
    .eq("university_id", profile.university_id)
    .is("claimed_by", null)
    .single();
  if (existingPlaceholder) return { existingPlaceholder };

  return { available: true };
}

export async function searchTargetUsers(query: string): Promise<
  | {
      data: Array<{
        id: string;
        handle: string;
        display_name: string | null;
        avatar_url: string | null;
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
    .select("id, handle, display_name, avatar_url")
    .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(10);

  if (error) {
    return { error: error.message };
  }

  return { data: data ?? [] };
}
