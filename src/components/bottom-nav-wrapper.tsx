import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/bottom-nav";

export default async function BottomNavWrapper() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isModerator = false;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile && (profile.role === "moderator" || profile.role === "admin")) {
      isModerator = true;
    }
  }

  return <BottomNav isModerator={isModerator} />;
}
