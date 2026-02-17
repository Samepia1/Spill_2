"use client";

import { useState, useTransition } from "react";
import { createReport } from "@/app/report-actions";

const REASONS = [
  { value: "harassment", label: "Harassment" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "false_info", label: "False information" },
  { value: "spam", label: "Spam" },
  { value: "privacy_violation", label: "Privacy violation" },
  { value: "other", label: "Other" },
] as const;

type ReportModalProps = {
  entityType: "post" | "comment" | "user";
  entityId: string;
  onClose: () => void;
};

export default function ReportModal({
  entityType,
  entityId,
  onClose,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!reason) {
      setError("Please select a reason");
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await createReport(
        entityType,
        entityId,
        reason,
        details || undefined
      );

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(onClose, 1500);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        {success ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              Report submitted. Thank you.
            </p>
          </div>
        ) : (
          <>
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Report {entityType}
            </h3>

            {/* Reason select */}
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mb-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">Select a reason...</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Details textarea */}
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Add any additional context..."
              className="mb-3 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />

            {error && (
              <p className="mb-3 text-sm text-red-500 dark:text-red-400">
                {error}
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={isPending}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
