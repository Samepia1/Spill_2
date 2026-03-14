"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { signOut, getCurrentUserProfile } from "./actions";
import Avatar from "@/components/avatar";
import AvatarUpload from "@/components/avatar-upload";

const themeOptions = [
  { value: "light" as const, label: "Light" },
  { value: "dark" as const, label: "Dark" },
  { value: "system" as const, label: "System" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [profile, setProfile] = useState<{
    id: string;
    handle: string;
    avatar_url: string | null;
  } | null>(null);

  useEffect(() => {
    getCurrentUserProfile().then(setProfile);
  }, []);

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <button
        onClick={() => router.back()}
        className="fixed top-4 right-4 z-50 rounded-full bg-white/80 p-2 text-zinc-500 shadow-sm backdrop-blur-sm transition-colors hover:text-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:text-zinc-100"
        aria-label="Close settings"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Settings
      </h1>

      {/* Profile link */}
      <Link
        href="/profile"
        className="mb-6 flex items-center gap-3 rounded-xl border border-zinc-100 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        {profile ? (
          <AvatarUpload userId={profile.id} currentAvatarUrl={profile.avatar_url} size="md" />
        ) : (
          <Avatar src={null} alt="Profile" size="md" />
        )}
        <div>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            View my profile
          </span>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            See your public profile and posts about you
          </p>
        </div>
        <svg
          className="ml-auto text-zinc-400 dark:text-zinc-500"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>

      {/* Appearance */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Appearance
        </h2>
        <div className="flex gap-2 rounded-xl border border-zinc-100 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                theme === option.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Account
        </h2>
        <button
          onClick={handleSignOut}
          disabled={isPending}
          className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          {isPending ? "Signing out..." : "Sign out"}
        </button>
      </section>
    </div>
  );
}
