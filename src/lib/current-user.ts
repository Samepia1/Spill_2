import { createClient } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  university_id: string;
  email: string;
  handle: string;
  display_name: string | null;
  role: string;
  status: string;
};

/** Fetches the current authenticated user and their public profile. Returns null if not authenticated or no profile. */
export async function getCurrentUser(): Promise<{
  userId: string;
  profile: UserProfile;
} | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, university_id, email, handle, display_name, role, status")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { userId: user.id, profile: profile as UserProfile };
}
