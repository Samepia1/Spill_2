"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { searchTargetUsers, createPost } from "./actions";

function CreatePostForm() {
  const searchParams = useSearchParams();

  const [targetHandle, setTargetHandle] = useState("");
  const [targetDisplayName, setTargetDisplayName] = useState<string | null>(
    null
  );
  const [targetQuery, setTargetQuery] = useState("");
  const [targetResults, setTargetResults] = useState<
    Array<{ id: string; handle: string; display_name: string | null }>
  >([]);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill target from URL param
  useEffect(() => {
    const target = searchParams.get("target");
    if (target) {
      setTargetHandle(target);
    }
  }, [searchParams]);

  // Debounced search for target users
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!targetQuery || targetQuery.length < 1) {
      setTargetResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const result = await searchTargetUsers(targetQuery);
      if ("data" in result) {
        setTargetResults(result.data);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [targetQuery]);

  function selectTarget(user: {
    id: string;
    handle: string;
    display_name: string | null;
  }) {
    setTargetHandle(user.handle);
    setTargetDisplayName(user.display_name);
    setTargetQuery("");
    setTargetResults([]);
    setShowTargetPicker(false);
  }

  function clearTarget() {
    setTargetHandle("");
    setTargetDisplayName(null);
    setTargetQuery("");
    setTargetResults([]);
    setShowTargetPicker(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("targetHandle", targetHandle);
    formData.set("subject", subject);
    formData.set("body", body);

    const result = await createPost(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // If successful, createPost calls redirect("/") so we won't reach here
  }

  const subjectLength = subject.length;
  const bodyLength = body.length;
  const canSubmit =
    targetHandle.length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    !loading;

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Create Post
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Target picker */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Who is this about?
          </label>

          {targetHandle ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                @{targetHandle}
                {targetDisplayName && (
                  <span className="text-zinc-500 dark:text-zinc-400">
                    ({targetDisplayName})
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearTarget}
                  className="ml-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  aria-label="Remove target"
                >
                  &times;
                </button>
              </span>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Search by handle or name..."
                value={targetQuery}
                onChange={(e) => {
                  setTargetQuery(e.target.value);
                  setShowTargetPicker(true);
                }}
                onFocus={() => setShowTargetPicker(true)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
              />

              {showTargetPicker && targetResults.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  {targetResults.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => selectTarget(user)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          @{user.handle}
                        </span>
                        {user.display_name && (
                          <span className="text-zinc-500 dark:text-zinc-400">
                            {user.display_name}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Subject input */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Subject
            </label>
            <span
              className={`text-xs ${
                subjectLength > 180
                  ? "text-red-500"
                  : "text-zinc-400"
              }`}
            >
              {subjectLength}/200
            </span>
          </div>
          <input
            id="subject"
            type="text"
            placeholder="What's the tea?"
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, 200))}
            maxLength={200}
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
          />
        </div>

        {/* Body textarea */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="body"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Spill it
            </label>
            <span
              className={`text-xs ${
                bodyLength > 900
                  ? "text-red-500"
                  : "text-zinc-400"
              }`}
            >
              {bodyLength}/1000
            </span>
          </div>
          <textarea
            id="body"
            placeholder="Write your confession..."
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 1000))}
            maxLength={1000}
            rows={5}
            className="min-h-[120px] w-full resize-none rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg p-4">
          <h1 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Create Post
          </h1>
          <div className="animate-pulse space-y-4">
            <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-32 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      }
    >
      <CreatePostForm />
    </Suspense>
  );
}
