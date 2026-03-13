"use client";

import { useTransition, useState } from "react";

type Props = {
  action: (body: string, isAnonymous: boolean) => Promise<{ error?: string; success?: boolean }>;
  identityMode: "anonymous" | "revealed" | "choose";
  userHandle: string;
  currentUserAnonNumber: number | null;
};

export default function CommentComposer({
  action,
  identityMode: initialMode,
  userHandle,
  currentUserAnonNumber,
}: Props) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [chosenMode, setChosenMode] = useState<"anonymous" | "revealed" | null>(
    initialMode === "choose" ? null : initialMode
  );

  function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed || !chosenMode) return;

    setError(null);
    startTransition(async () => {
      const result = await action(trimmed, chosenMode === "anonymous");
      if (result.error) {
        setError(result.error);
      } else {
        setBody("");
      }
    });
  }

  // Show identity choice buttons if user hasn't chosen yet
  if (!chosenMode) {
    return (
      <div className="sticky bottom-16 border-t border-zinc-200 bg-white/95 p-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
        <p className="mb-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
          How do you want to comment in this thread?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setChosenMode("anonymous")}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Anonymously
          </button>
          <button
            onClick={() => setChosenMode("revealed")}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            As @{userHandle}
          </button>
        </div>
      </div>
    );
  }

  const identityLabel =
    chosenMode === "anonymous"
      ? currentUserAnonNumber
        ? `Anon ${currentUserAnonNumber}`
        : "Anonymous"
      : `@${userHandle}`;

  return (
    <div className="sticky bottom-16 border-t border-zinc-200 bg-white/95 p-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
      <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
        Commenting as{" "}
        <span className="font-medium text-zinc-600 dark:text-zinc-300">
          {identityLabel}
        </span>
      </p>

      {error && (
        <p className="mb-2 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Add a comment..."
            className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          />
          <div className="mt-1 text-right text-xs text-zinc-400 dark:text-zinc-500">
            {body.length}/300
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isPending || !body.trim()}
          className="mb-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
