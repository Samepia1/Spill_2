"use client";

import { formatRelativeTime } from "@/lib/time";

export type SafeComment = {
  id: string;
  body: string;
  createdAt: string;
  anonNumber: number;
  isCurrentUser: boolean;
};

export default function CommentList({ comments }: { comments: SafeComment[] }) {
  if (comments.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
        No comments yet. Be the first to spill.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="rounded-lg border border-zinc-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${
                comment.anonNumber === 1
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              Anon {comment.anonNumber}
              {comment.anonNumber === 1 && (
                <span className="ml-1 text-xs font-normal text-violet-500 dark:text-violet-400">
                  (OP)
                </span>
              )}
              {comment.isCurrentUser && (
                <span className="ml-1 text-xs font-normal text-zinc-400 dark:text-zinc-500">
                  (you)
                </span>
              )}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {comment.body}
          </p>
        </div>
      ))}
    </div>
  );
}
