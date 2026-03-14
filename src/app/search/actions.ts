"use server";

import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

export type RankedUser = {
  id: string;
  handle: string;
  display_name: string | null;
  activity: number;
};

export async function searchUsersRanked(
  query: string,
  offset: number
): Promise<{ data: RankedUser[]; hasMore: boolean } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_users_by_activity", {
    search_query: query.trim(),
    result_limit: PAGE_SIZE,
    result_offset: offset,
  });

  if (error) {
    return { error: error.message };
  }

  const results: RankedUser[] = (data ?? []).map(
    (row: { id: string; handle: string; display_name: string | null; activity: number }) => ({
      id: row.id,
      handle: row.handle,
      display_name: row.display_name,
      activity: Number(row.activity),
    })
  );

  return { data: results, hasMore: results.length === PAGE_SIZE };
}
