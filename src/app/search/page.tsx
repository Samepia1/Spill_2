"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { searchUsers } from "./actions";

type UserResult = {
  id: string;
  handle: string;
  display_name: string | null;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const response = await searchUsers(query);
      if ("data" in response) {
        setResults(response.data);
      } else {
        setResults([]);
      }
      setHasSearched(true);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

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
        <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
          Searching...
        </p>
      )}

      {!loading && !hasSearched && (
        <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
          Search for someone at your university
        </p>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
          No users found
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((user) => (
            <Link
              key={user.id}
              href={`/profile/${user.handle}`}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                @{user.handle}
              </span>
              {user.display_name && (
                <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {user.display_name}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
