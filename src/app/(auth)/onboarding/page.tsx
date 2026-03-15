"use client";

import { useState, useEffect, useRef } from "react";
import { completeOnboarding } from "../actions";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/avatar";
import { compressImage } from "@/lib/compress-image";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const compressed = await compressImage(file);
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true });

      if (uploadError) {
        setError("Upload failed: " + uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    const handle = formData.get("handle") as string;
    if (!handle || !/^[a-zA-Z0-9_]{3,20}$/.test(handle)) {
      setError(
        "Handle must be 3-20 characters and contain only letters, numbers, and underscores."
      );
      setLoading(false);
      return;
    }

    if (avatarUrl) {
      formData.set("avatar_url", avatarUrl);
    }

    const result = await completeOnboarding(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Set up your profile
      </h2>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Pick a handle so people can find you.
      </p>

      <form action={handleSubmit}>
        {/* Avatar upload */}
        <div className="mb-5 flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="group relative cursor-pointer disabled:cursor-wait"
          >
            <Avatar src={avatarUrl} alt="Your avatar" size="lg" />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            Add a profile photo (optional)
          </p>
        </div>

        <label
          htmlFor="handle"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Handle
        </label>
        <input
          id="handle"
          name="handle"
          type="text"
          placeholder="your_handle"
          required
          maxLength={20}
          className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
        />

        <label
          htmlFor="display_name"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Display name{" "}
          <span className="text-zinc-400 dark:text-zinc-500">(optional)</span>
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          placeholder="Your Name"
          maxLength={50}
          className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
        />

        <label
          htmlFor="phone_number"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Phone number{" "}
          <span className="text-zinc-400 dark:text-zinc-500">(optional)</span>
        </label>
        <input
          id="phone_number"
          name="phone_number"
          type="tel"
          placeholder="(555) 123-4567"
          className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
        />
        <p className="mb-4 -mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          Add your phone so posts about you can be linked to your profile
        </p>

        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Creating profile..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
