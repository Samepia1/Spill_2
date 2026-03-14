"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useTransition } from "react";

type SortValue = "top" | "newest" | "comments" | "ending";

const sortTabs: { label: string; value: SortValue }[] = [
  { label: "Top", value: "top" },
  { label: "Newest", value: "newest" },
  { label: "Most Comments", value: "comments" },
  { label: "Ending Soon", value: "ending" },
];

function ProfileSortTabsInner({ handle }: { handle: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const sort = searchParams.get("sort");
  const activeSort: SortValue =
    sort === "top" || sort === "newest" || sort === "comments" || sort === "ending"
      ? sort
      : "newest";

  function handleSortChange(value: SortValue) {
    const href =
      value === "newest"
        ? `/profile/${handle}`
        : `/profile/${handle}?sort=${value}`;
    startTransition(() => {
      router.replace(href);
    });
  }

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      <div className={`flex gap-1 px-4 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
        {sortTabs.map((tab) => {
          const isActive = activeSort === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => handleSortChange(tab.value)}
              className={`relative px-4 py-3 text-sm transition-colors active:opacity-70 ${
                isActive
                  ? "font-semibold text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-100" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfileSortTabs({ handle }: { handle: string }) {
  return (
    <Suspense
      fallback={
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-1 px-4">
            {sortTabs.map((tab) => (
              <span
                key={tab.value}
                className={`px-4 py-3 text-sm ${
                  tab.value === "newest"
                    ? "font-semibold text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {tab.label}
              </span>
            ))}
          </div>
        </div>
      }
    >
      <ProfileSortTabsInner handle={handle} />
    </Suspense>
  );
}
