"use client";

import { useState } from "react";
import { completeOnboarding } from "../actions";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
