"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";

export async function loginWithOtp(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email || !email.endsWith(".edu")) {
    return { error: "Please enter a valid .edu email address." };
  }

  const domain = email.split("@")[1];
  const supabase = await createClient();

  // Check if university exists
  const { data: university } = await supabase
    .from("universities")
    .select("id")
    .eq("email_domain", domain)
    .single();

  if (!university) {
    return { error: "Your university is not supported yet." };
  }

  // Send OTP
  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    return { error: error.message };
  }

  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(formData: FormData) {
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;

  if (!email || !token) {
    return { error: "Email and verification code are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: error.message };
  }

  // Check if user has a profile
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication failed." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/onboarding");
  }

  redirect("/");
}

export async function resendOtp(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    return { error: error.message };
  }

  return { success: "Code resent successfully." };
}

export async function completeOnboarding(formData: FormData) {
  const handle = formData.get("handle") as string;
  const displayName = (formData.get("display_name") as string) || null;
  const avatarUrl = (formData.get("avatar_url") as string) || null;
  const phoneNumber = formData.get("phone_number") as string | null;

  if (!handle || !/^[a-zA-Z0-9_]{3,20}$/.test(handle)) {
    return {
      error:
        "Handle must be 3-20 characters and contain only letters, numbers, and underscores.",
    };
  }

  // Validate phone number if provided
  let normalizedPhone: string | null = null;
  if (phoneNumber && phoneNumber.trim() !== "") {
    normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      return { error: "Invalid phone number format" };
    }
  }

  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || !authUser.email) {
    return { error: "You must be logged in." };
  }

  // Look up university by email domain
  const domain = authUser.email.split("@")[1];
  const { data: university } = await supabase
    .from("universities")
    .select("id")
    .eq("email_domain", domain)
    .single();

  if (!university) {
    return { error: "Your university is not supported." };
  }

  const universityId = university.id;

  // Insert user profile
  const { error } = await supabase.from("users").insert({
    id: authUser.id,
    university_id: universityId,
    email: authUser.email,
    email_verified: true,
    handle,
    display_name: displayName,
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    ...(normalizedPhone ? { phone_number: normalizedPhone } : {}),
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That handle is already taken." };
    }
    return { error: error.message };
  }

  // Claim any placeholder profiles matching this phone number
  if (normalizedPhone) {
    await supabase.rpc("claim_placeholder_profile", {
      p_phone_number: normalizedPhone,
      p_user_id: authUser.id,
      p_university_id: universityId,
    });
  }

  redirect("/");
}
