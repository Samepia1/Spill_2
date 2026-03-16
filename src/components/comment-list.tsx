"use client";

import { useState } from "react";
import { formatRelativeTime } from "@/lib/time";
import ReportModal from "@/components/report-modal";
import Avatar from "@/components/avatar";
import MentionText from "@/components/mention-text";

export type SafeComment = {
  id: string;
  body: string;
  createdAt: string;
  isAnonymous: boolean;
  anonNumber: number | null;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isCurrentUser: boolean;
  isOp: boolean;
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
          id={`comment-${comment.id}`}
          data-anon-number={comment.isAnonymous ? comment.anonNumber : undefined}
          className="rounded-lg border border-zinc-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-1 flex items-center gap-2">
            <Avatar
              src={comment.avatarUrl}
              alt={comment.isAnonymous ? `Anon ${comment.anonNumber}` : `@${comment.handle}`}
              isAnonymous={comment.isAnonymous}
              size="xs"
            />
            <span
              className={`text-sm font-semibold ${
                comment.isOp
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {comment.isAnonymous
                ? `Anon ${comment.anonNumber}`
                : `@${comment.handle}`}
              {comment.isOp && (
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
                className="ml-auto text-zinc-400 transition-colors hover:text-orange-500 dark:text-zinc-500 dark:hover:text-orange-400 active:opacity-60"
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
            <MentionText text={comment.body} className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300" />
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
