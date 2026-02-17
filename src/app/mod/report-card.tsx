"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/time";
import {
  removePost,
  removeComment,
  suspendUser,
  dismissReport,
} from "./actions";

const REASON_LABELS: Record<string, string> = {
  harassment: "Harassment",
  hate_speech: "Hate speech",
  false_info: "False information",
  spam: "Spam",
  privacy_violation: "Privacy violation",
  other: "Other",
};

const ENTITY_LABELS: Record<string, string> = {
  post: "Post",
  comment: "Comment",
  user: "User",
};

type ReportCardProps = {
  id: string;
  entityType: string;
  entityId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
};

type EntityContent = {
  loaded: boolean;
  text: string | null;
  authorHandle?: string;
};

export default function ReportCard({
  id,
  entityType,
  entityId,
  reason,
  details,
  status,
  createdAt,
}: ReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<EntityContent>({
    loaded: false,
    text: null,
  });
  const [actionMode, setActionMode] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadContent() {
    if (content.loaded) {
      setExpanded(!expanded);
      return;
    }

    const supabase = createClient();

    if (entityType === "post") {
      const { data } = await supabase
        .from("posts")
        .select("subject, body")
        .eq("id", entityId)
        .single();
      setContent({
        loaded: true,
        text: data ? `${data.subject}\n\n${data.body}` : "[Post not found]",
      });
    } else if (entityType === "comment") {
      const { data } = await supabase
        .from("comments")
        .select("body")
        .eq("id", entityId)
        .single();
      setContent({
        loaded: true,
        text: data ? data.body : "[Comment not found]",
      });
    } else if (entityType === "user") {
      const { data } = await supabase
        .from("users")
        .select("handle, display_name, status")
        .eq("id", entityId)
        .single();
      setContent({
        loaded: true,
        text: data
          ? `@${data.handle}${data.display_name ? ` (${data.display_name})` : ""} — Status: ${data.status}`
          : "[User not found]",
      });
    }

    setExpanded(true);
  }

  function handleAction(action: string) {
    if (actionMode === action) {
      // Second click — execute
      if (!actionReason.trim() && action !== "dismiss") {
        setError("Please provide a reason");
        return;
      }

      setError("");
      startTransition(async () => {
        let result: { error?: string; success?: boolean };

        if (action === "remove_post") {
          result = await removePost(entityId, id, actionReason.trim());
        } else if (action === "remove_comment") {
          result = await removeComment(entityId, id, actionReason.trim());
        } else if (action === "suspend_user") {
          result = await suspendUser(entityId, id, actionReason.trim());
        } else {
          result = await dismissReport(id);
        }

        if (result.error) {
          setError(result.error);
        } else {
          setActionMode(null);
          setActionReason("");
        }
      });
    } else {
      // First click — show reason input (or execute immediately for dismiss)
      if (action === "dismiss") {
        setError("");
        startTransition(async () => {
          const result = await dismissReport(id);
          if (result.error) {
            setError(result.error);
          }
        });
      } else {
        setActionMode(action);
        setActionReason("");
        setError("");
      }
    }
  }

  const isOpen = status === "open";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {ENTITY_LABELS[entityType] ?? entityType}
        </span>
        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
          {REASON_LABELS[reason] ?? reason}
        </span>
        <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
          {formatRelativeTime(createdAt)}
        </span>
      </div>

      {/* Details from reporter */}
      {details && (
        <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
          {details}
        </p>
      )}

      {/* Expand/collapse button */}
      <button
        onClick={loadContent}
        className="mb-2 text-sm font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
      >
        {expanded ? "Hide content" : "View content"}
      </button>

      {/* Expanded content */}
      {expanded && content.loaded && (
        <div className="mb-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {content.text}
          </p>
        </div>
      )}

      {/* Action buttons (only for open reports) */}
      {isOpen && (
        <div className="flex flex-col gap-2">
          {/* Reason input (when action is selected) */}
          {actionMode && (
            <input
              type="text"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Reason for action..."
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          )}

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-2">
            {entityType === "post" && (
              <button
                onClick={() => handleAction("remove_post")}
                disabled={isPending}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  actionMode === "remove_post"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                }`}
              >
                {actionMode === "remove_post"
                  ? isPending
                    ? "Removing..."
                    : "Confirm Remove"
                  : "Remove Post"}
              </button>
            )}

            {entityType === "comment" && (
              <button
                onClick={() => handleAction("remove_comment")}
                disabled={isPending}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  actionMode === "remove_comment"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                }`}
              >
                {actionMode === "remove_comment"
                  ? isPending
                    ? "Removing..."
                    : "Confirm Remove"
                  : "Remove Comment"}
              </button>
            )}

            {entityType === "user" && (
              <button
                onClick={() => handleAction("suspend_user")}
                disabled={isPending}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  actionMode === "suspend_user"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                }`}
              >
                {actionMode === "suspend_user"
                  ? isPending
                    ? "Suspending..."
                    : "Confirm Suspend"
                  : "Suspend User"}
              </button>
            )}

            <button
              onClick={() => handleAction("dismiss")}
              disabled={isPending}
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {isPending && !actionMode ? "Dismissing..." : "Dismiss"}
            </button>

            {actionMode && (
              <button
                onClick={() => {
                  setActionMode(null);
                  setActionReason("");
                  setError("");
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
