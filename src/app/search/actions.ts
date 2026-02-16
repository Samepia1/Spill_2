"use server";

import { createClient } from "@/lib/supabase/server";

export async function searchUsers(query: string): Promise<
  | { data: Array<{ id: string; handle: string; display_name: string | null }> }
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
    .limit(20);

  if (error) {
    return { error: error.message };
  }

  return { data: data ?? [] };
}
