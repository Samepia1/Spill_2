"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getPlaceholderSmsData, getCurrentUserId, recordSmsPrompt } from "../actions";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const placeholderId = searchParams.get("placeholder");
  const postId = searchParams.get("post");

  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [handle, setHandle] = useState<string>("unknown");
  const [postCount, setPostCount] = useState(1);
  const [showSmsPrompt, setShowSmsPrompt] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!placeholderId || !postId) return;

    Promise.all([
      getPlaceholderSmsData(placeholderId),
      getCurrentUserId(),
    ]).then(([smsData, uid]) => {
      if (smsData && !("error" in smsData)) {
        setPhoneNumber(smsData.phoneNumber);
        setHandle(smsData.handle);
        setPostCount(smsData.postCount);
        setShowSmsPrompt(smsData.showSmsPrompt);
      }
      setUserId(uid);
      setLoading(false);
    });
  }, [placeholderId, postId]);

  if (!placeholderId || !postId) {
    router.replace("/");
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
      </div>
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://spillapp.co";
  const referralLink = `${baseUrl}/invite?ref=${userId}`;
  const postWord = postCount === 1 ? "post has" : "posts have";
  const smsBody = `Yo, ${postCount} ${postWord} been made about you on Spill! Sign up to see what people are saying: ${referralLink}`;
  const smsHref = `sms:${phoneNumber}?&body=${encodeURIComponent(smsBody)}`;

  function handleSendText() {
    if (placeholderId) {
      recordSmsPrompt(placeholderId).catch(() => {});
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md px-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Success checkmark */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <h2 className="mb-1 text-center text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Post published!
          </h2>
          <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Your post about @{handle} is live.
          </p>

          {showSmsPrompt && phoneNumber && (
            <div className="mb-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="mb-3 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Let them know they&apos;re being talked about on Spill
              </p>
              <a
                href={smsHref}
                onClick={handleSendText}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Send Text
              </a>
            </div>
          )}

          <button
            onClick={() => router.push(`/profile/${handle}`)}
            className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors active:scale-[0.98] ${
              showSmsPrompt && phoneNumber
                ? "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            }`}
          >
            {showSmsPrompt && phoneNumber ? "Skip" : "View their profile"}
          </button>

          {!(showSmsPrompt && phoneNumber) && (
            <button
              onClick={() => router.push("/")}
              className="mt-2 w-full rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Back to feed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
