"use client";

import { useState } from "react";
import { formatRelativeTime } from "@/lib/time";
import ReportModal from "@/components/report-modal";

export type SafeComment = {
  id: string;
  body: string;
  createdAt: string;
  anonNumber: number;
  isCurrentUser: boolean;
  status: string;
};

export default function CommentList({ comments }: { comments: SafeComment[] }) {
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(
    null
  );

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
            {/* Report button — hidden for own comments and removed comments */}
            {!comment.isCurrentUser && comment.status === "active" && (
              <button
                onClick={() => setReportingCommentId(comment.id)}
                className="ml-auto text-zinc-400 transition-colors hover:text-orange-500 dark:text-zinc-500 dark:hover:text-orange-400"
              >
                <FlagIcon />
              </button>
            )}
          </div>
          {comment.status === "removed" ? (
            <p className="text-sm italic text-zinc-400 dark:text-zinc-500">
              [This comment has been removed]
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {comment.body}
            </p>
          )}
        </div>
      ))}

      {reportingCommentId && (
        <ReportModal
          entityType="comment"
          entityId={reportingCommentId}
          onClose={() => setReportingCommentId(null)}
        />
      )}
    </div>
  );
}

function FlagIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
