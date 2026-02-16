"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { timeRemaining } from "@/lib/time";
import { toggleLike } from "@/app/actions";

export type PostCardProps = {
  id: string;
  subject: string;
  body: string;
  targetHandle: string;
  targetDisplayName: string | null;
  expiresAt: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  userHasLiked: boolean;
};

export default function PostCard({
  id,
  subject,
  body,
  targetHandle,
  targetDisplayName,
  expiresAt,
  likeCount,
  commentCount,
  userHasLiked,
}: PostCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticLiked, setOptimisticLiked] = useState(userHasLiked);
  const [optimisticCount, setOptimisticCount] = useState(likeCount);

  function handleLike() {
    const wasLiked = optimisticLiked;
    setOptimisticLiked(!wasLiked);
    setOptimisticCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    startTransition(async () => {
      try {
        await toggleLike(id);
      } catch {
        // Revert on error
        setOptimisticLiked(wasLiked);
        setOptimisticCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      }
    });
  }

  const remaining = timeRemaining(expiresAt);
  const isExpired = remaining === "Expired";

  return (
    <article className="rounded-xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header: target + time remaining */}
      <div className="mb-2 flex items-center justify-between">
        <Link
          href={`/profile/${targetHandle}`}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          @{targetHandle}
          {targetDisplayName && (
            <span className="ml-1 text-zinc-400 dark:text-zinc-500">
              ({targetDisplayName})
            </span>
          )}
        </Link>

        <span
          className={`text-xs ${
            isExpired
              ? "text-red-500 dark:text-red-400"
              : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {remaining}
        </span>
      </div>

      {/* Subject */}
      <h3 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {subject}
      </h3>

      {/* Body */}
      <p className="mb-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {body}
      </p>

      {/* Actions: like + comment */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleLike}
          disabled={isPending}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            optimisticLiked
              ? "text-red-500 dark:text-red-400"
              : "text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
          } disabled:opacity-50`}
        >
          <HeartIcon filled={optimisticLiked} />
          <span>{optimisticCount}</span>
        </button>

        <Link
          href={`/post/${id}`}
          className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          <ChatIcon />
          <span>{commentCount}</span>
        </Link>
      </div>
    </article>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
