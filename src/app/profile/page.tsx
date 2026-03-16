"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserHandle } from "@/app/create/actions";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    getCurrentUserHandle().then((handle) => {
      if (handle) {
        router.replace(`/profile/${handle}`);
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  // Show loading skeleton matching /profile/[handle]/loading.tsx while redirecting
  return (
    <div className="mx-auto max-w-lg">
      <header className="px-4 pt-6 pb-4">
        <div className="mb-3 h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        <div className="mb-2 h-7 w-32 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        <div className="h-5 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </header>
    </div>
  );
}
