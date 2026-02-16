"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type TabValue = "trending" | "new" | "ending";

const tabs: { label: string; value: TabValue }[] = [
  { label: "Trending", value: "trending" },
  { label: "New", value: "new" },
  { label: "Ending Soon", value: "ending" },
];

function FeedTabsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabValue) || "trending";

  function handleTabChange(value: TabValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "trending") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "/");
  }

  return (
    <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-lg gap-1 px-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`relative px-4 py-3 text-sm transition-colors ${
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

export default function FeedTabs() {
  return (
    <Suspense
      fallback={
        <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="mx-auto flex max-w-lg gap-1 px-4">
            {tabs.map((tab) => (
              <span
                key={tab.value}
                className={`px-4 py-3 text-sm ${
                  tab.value === "trending"
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
      <FeedTabsInner />
    </Suspense>
  );
}
