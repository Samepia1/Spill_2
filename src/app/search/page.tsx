"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { searchUsersRanked, type RankedUser } from "./actions";
import Avatar from "@/components/avatar";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load initial or search results
  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      setResults([]);
      setHasMore(false);
      const response = await searchUsersRanked(query, 0);
      if ("data" in response) {
        setResults(response.data);
        setHasMore(response.hasMore);
      }
      setLoading(false);
    }, query.length > 0 ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [query]);

  // Load more callback
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const response = await searchUsersRanked(query, results.length);
    if ("data" in response) {
      setResults((prev) => [...prev, ...response.data]);
      setHasMore(response.hasMore);
    }
    setLoadingMore(false);
  }, [query, results.length, loadingMore, hasMore]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Search
      </h1>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by handle or name..."
        className="mb-4 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
      />

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {!loading && results.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
          {query.length > 0 ? "No users found" : "No users at your university yet"}
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((user) => (
            <Link
              key={user.id}
              href={`/profile/${user.handle}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-all duration-150 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <div className="flex items-center gap-3">
                <Avatar src={user.avatar_url} alt={`@${user.handle}`} size="sm" />
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    @{user.handle}
                  </span>
                {user.display_name && (
                  <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {user.display_name}
                  </span>
                )}
                </div>
              </div>
              {user.activity > 0 && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {user.activity} {user.activity === 1 ? "post & comment" : "posts & comments"}
                </span>
              )}
            </Link>
          ))}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-1" />

          {loadingMore && (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-zinc-400 dark:text-zinc-500"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
