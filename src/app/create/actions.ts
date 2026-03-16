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
    .select("id, university_id, status, handle")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  // 3. Check if suspended
  if (profile.status === "suspended") {
    return { error: "Your account is suspended" };
  }

  // 4. Parse media items
  const mediaItemsRaw = formData.get("mediaItems") as string | null;
  const mediaItems: Array<{
    storagePath: string;
    publicUrl: string;
    mediaType: "image" | "video";
    fileSizeBytes: number;
    mimeType: string;
    thumbnailUrl: string | null;
    displayOrder: number;
    width: number | null;
    height: number | null;
  }> = mediaItemsRaw ? JSON.parse(mediaItemsRaw) : [];
  const hasMedia = mediaItems.length > 0;

  if (mediaItems.length > 10) {
    return { error: "Maximum 10 media files allowed" };
  }

  // 5. Validate subject (optional if media attached)
  const trimmedSubject = subject?.trim() ?? "";
  if (trimmedSubject.length > 200) {
    return { error: "Subject must be 200 characters or less" };
  }

  // 6. Validate body (optional if media attached)
  const trimmedBody = body?.trim() ?? "";
  if (trimmedBody.length > 1000) {
    return { error: "Body must be 1000 characters or less" };
  }

  // At least one form of content required
  if (!trimmedSubject && !trimmedBody && !hasMedia) {
    return { error: "Post must have text or media" };
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
    const { data: newPost, error: postError } = await supabase.from("posts").insert({
      university_id: profile.university_id,
      author_user_id: user.id,
      target_user_id: null,
      target_placeholder_id: placeholderId,
      subject: trimmedSubject || null,
      body: trimmedBody || null,
      is_anonymous: isAnonymous,
      media_count: mediaItems.length,
      ...(expires_at ? { expires_at } : {}),
    }).select("id").single();

    if (postError) return { error: postError.message };

    // ─── MODERATION HOOK ───────────────────────────────────────
    // Future: call Google Vision API here to check each media file.
    // If any file is flagged, set its moderation_status to 'rejected'
    // and either block the post or mark it for review.
    // For now, all media defaults to 'pending' status.
    // ───────────────────────────────────────────────────────────

    // Insert media items
    if (mediaItems.length > 0 && newPost) {
      const mediaRows = mediaItems.map((m) => ({
        post_id: newPost.id,
        university_id: profile.university_id,
        storage_path: m.storagePath,
        public_url: m.publicUrl,
        media_type: m.mediaType,
        file_size_bytes: m.fileSizeBytes,
        mime_type: m.mimeType,
        thumbnail_url: m.thumbnailUrl,
        display_order: m.displayOrder,
        width: m.width,
        height: m.height,
      }));

      const { error: mediaError } = await supabase.from("post_media").insert(mediaRows);
      if (mediaError) return { error: mediaError.message };
    }

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
  const { data: newPost, error: insertError } = await supabase.from("posts").insert({
    university_id: profile.university_id,
    author_user_id: user.id,
    target_user_id: target.id,
    subject: trimmedSubject || null,
    body: trimmedBody || null,
    is_anonymous: isAnonymous,
    media_count: mediaItems.length,
    ...(expires_at ? { expires_at } : {}),
  }).select("id").single();

  if (insertError) {
    return { error: insertError.message };
  }

  // ─── MODERATION HOOK ───────────────────────────────────────
  // Future: call Google Vision API here to check each media file.
  // If any file is flagged, set its moderation_status to 'rejected'
  // and either block the post or mark it for review.
  // For now, all media defaults to 'pending' status.
  // ───────────────────────────────────────────────────────────

  // Insert media items
  if (mediaItems.length > 0 && newPost) {
    const mediaRows = mediaItems.map((m) => ({
      post_id: newPost.id,
      university_id: profile.university_id,
      storage_path: m.storagePath,
      public_url: m.publicUrl,
      media_type: m.mediaType,
      file_size_bytes: m.fileSizeBytes,
      mime_type: m.mimeType,
      thumbnail_url: m.thumbnailUrl,
      display_order: m.displayOrder,
      width: m.width,
      height: m.height,
    }));

    const { error: mediaError } = await supabase.from("post_media").insert(mediaRows);
    if (mediaError) return { error: mediaError.message };
  }

  // Notify target user
  if (newPost) {
    try {
      await supabase.from("notifications").insert({
        university_id: profile.university_id,
        recipient_id: target.id,
        actor_id: user.id,
        type: "new_post",
        post_id: newPost.id,
        actor_handle: isAnonymous ? null : profile.handle,
        post_subject: trimmedSubject || "(media post)",
      });
    } catch {
      // Fire-and-forget
    }
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

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
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
