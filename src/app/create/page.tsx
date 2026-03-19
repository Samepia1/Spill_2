"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { searchTargetUsers, createPost, getCurrentUserHandle, getCurrentUserId, checkPhoneNumber } from "./actions";
import Avatar from "@/components/avatar";
import MediaPicker from "@/components/media-picker";
import { useMediaUpload } from "@/hooks/use-media-upload";
import MentionAutocomplete from "@/components/mention-autocomplete";
import { mentionToken, displayLength } from "@/lib/mentions";

function CreatePostForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentUserHandle, setCurrentUserHandle] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const tempPostId = useMemo(() => crypto.randomUUID(), []);
  const [targetHandle, setTargetHandle] = useState("");
  const [targetDisplayName, setTargetDisplayName] = useState<string | null>(
    null
  );
  const [targetQuery, setTargetQuery] = useState("");
  const [targetResults, setTargetResults] = useState<
    Array<{ id: string; handle: string; display_name: string | null; avatar_url: string | null }>
  >([]);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [subject, setSubject] = useState("");
  const [displayBody, setDisplayBody] = useState("");
  const [rawBody, setRawBody] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [expires, setExpires] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Phone number fallback state
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneResult, setPhoneResult] = useState<{
    type: "existing" | "placeholder" | "available";
    handle?: string;
    placeholderId?: string;
  } | null>(null);
  const [targetPhoneNumber, setTargetPhoneNumber] = useState<string | null>(null);
  const [targetIsPlaceholder, setTargetIsPlaceholder] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch current user's handle and ID
  useEffect(() => {
    getCurrentUserHandle().then(setCurrentUserHandle);
    getCurrentUserId().then(setCurrentUserId);
  }, []);

  const {
    mediaFiles,
    addFiles: addMediaFiles,
    removeFile: removeMediaFile,
    isUploading,
    error: mediaError,
  } = useMediaUpload(currentUserId ?? "", tempPostId);

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

  // Auto-check phone number when 10+ digits entered
  useEffect(() => {
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 10) {
      setPhoneResult(null);
      return;
    }

    setPhoneChecking(true);
    checkPhoneNumber(phoneNumber).then((result) => {
      setPhoneChecking(false);
      if ("error" in result) {
        setPhoneResult(null);
        return;
      }
      if ("existingUser" in result) {
        setPhoneResult({ type: "existing", handle: result.existingUser.handle });
      } else if ("existingPlaceholder" in result) {
        // Auto-select the existing placeholder
        setPhoneResult({ type: "placeholder", handle: result.existingPlaceholder.handle, placeholderId: result.existingPlaceholder.id });
        setTargetHandle(result.existingPlaceholder.handle);
        setTargetPhoneNumber(phoneNumber);
        setTargetIsPlaceholder(true);
        setIsAnonymous(false);
        setShowPhoneInput(false);
        setPhoneNumber("");
      } else {
        setPhoneResult({ type: "available" });
      }
    });
  }, [phoneNumber]);

  function handlePhoneInputStart() {
    setShowPhoneInput(true);
    setTargetQuery("");
    setTargetResults([]);
    setShowTargetPicker(false);
    setPhoneResult(null);
    setPhoneNumber("");
  }

  function handleBackToSearch() {
    setShowPhoneInput(false);
    setPhoneNumber("");
    setPhoneResult(null);
    setPhoneChecking(false);
  }

  function selectPhoneTarget() {
    const digits = phoneNumber.replace(/\D/g, "");
    const lastFour = digits.slice(-4);
    const placeholderHandle = `phone_${lastFour}`;
    setTargetHandle(placeholderHandle);
    setTargetPhoneNumber(phoneNumber);
    setTargetIsPlaceholder(true);
    setIsAnonymous(false);
    setShowPhoneInput(false);
    setPhoneNumber("");
    setPhoneResult(null);
  }

  function selectTarget(user: {
    id: string;
    handle: string;
    display_name: string | null;
    avatar_url: string | null;
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
    setTargetPhoneNumber(null);
    setTargetIsPlaceholder(false);
    setShowPhoneInput(false);
    setPhoneNumber("");
    setPhoneResult(null);
  }

  // Dual-state text management for mention autocomplete in body
  function displayToRawIndex(displayIdx: number): number {
    const mentionRegex = /@\[([^\]]+)\]\((\w+):([^)]+)\)/g;
    let match;
    let lastRawEnd = 0;
    let dispIdx = 0;

    const matches: Array<{ rawStart: number; rawEnd: number; displayLen: number }> = [];
    while ((match = mentionRegex.exec(rawBody)) !== null) {
      matches.push({ rawStart: match.index, rawEnd: match.index + match[0].length, displayLen: match[1].length + 1 });
    }

    for (const m of matches) {
      const plainBefore = m.rawStart - lastRawEnd;
      if (dispIdx + plainBefore >= displayIdx) return lastRawEnd + (displayIdx - dispIdx);
      dispIdx += plainBefore;
      if (dispIdx + m.displayLen >= displayIdx) return m.rawEnd;
      dispIdx += m.displayLen;
      lastRawEnd = m.rawEnd;
    }
    return lastRawEnd + (displayIdx - dispIdx);
  }

  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplay = e.target.value;
    if (newDisplay.length > displayBody.length) {
      const insertPos = (e.target.selectionStart ?? newDisplay.length) - (newDisplay.length - displayBody.length);
      const inserted = newDisplay.slice(insertPos, insertPos + (newDisplay.length - displayBody.length));
      const rawInsertPos = displayToRawIndex(insertPos);
      setRawBody(rawBody.slice(0, rawInsertPos) + inserted + rawBody.slice(rawInsertPos));
    } else {
      const deleteStart = e.target.selectionStart ?? 0;
      const charsRemoved = displayBody.length - newDisplay.length;
      // Check if deletion hits a mention token
      const mentionRegex = /@\[([^\]]+)\]\((\w+):([^)]+)\)/g;
      let match;
      let newRaw = rawBody;
      let handled = false;

      // Rebuild position map
      const mentions: Array<{ rawStart: number; rawEnd: number; dispStart: number; dispEnd: number; token: string }> = [];
      let dIdx = 0;
      let lastEnd = 0;
      while ((match = mentionRegex.exec(rawBody)) !== null) {
        dIdx += match.index - lastEnd;
        mentions.push({ rawStart: match.index, rawEnd: match.index + match[0].length, dispStart: dIdx, dispEnd: dIdx + match[1].length + 1, token: match[0] });
        dIdx += match[1].length + 1;
        lastEnd = match.index + match[0].length;
      }

      for (const m of mentions) {
        if (deleteStart < m.dispEnd && deleteStart + charsRemoved > m.dispStart) {
          newRaw = rawBody.slice(0, m.rawStart) + rawBody.slice(m.rawEnd);
          handled = true;
          break;
        }
      }

      if (!handled) {
        const rawDeleteStart = displayToRawIndex(deleteStart);
        newRaw = rawBody.slice(0, rawDeleteStart) + rawBody.slice(rawDeleteStart + charsRemoved);
      }
      setRawBody(newRaw);
    }
    setDisplayBody(newDisplay);
  }, [displayBody, rawBody]);

  const handleBodyMention = useCallback((
    mention: { label: string; type: "user" | "anon"; id: string },
    atIndex: number,
    queryLength: number
  ) => {
    const displayLabel = mention.label;
    const displayInsert = `@${displayLabel} `;
    const rawInsert = mentionToken(displayLabel, mention.type, mention.id) + " ";

    const newDisplay = displayBody.slice(0, atIndex) + displayInsert + displayBody.slice(atIndex + queryLength);
    const rawAtIndex = displayToRawIndex(atIndex);
    const newRaw = rawBody.slice(0, rawAtIndex) + rawInsert + rawBody.slice(rawAtIndex + queryLength);

    setDisplayBody(newDisplay);
    setRawBody(newRaw);

    setTimeout(() => {
      if (bodyRef.current) {
        const newCursor = atIndex + displayInsert.length;
        bodyRef.current.focus();
        bodyRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  }, [displayBody, rawBody]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    if (targetPhoneNumber) {
      formData.set("targetPhoneNumber", targetPhoneNumber);
    } else {
      formData.set("targetHandle", targetHandle);
    }
    formData.set("subject", subject);
    formData.set("body", rawBody);
    formData.set("isAnonymous", String(isAnonymous));
    if (expires) {
      formData.set("expiresInHours", String(expiresInHours));
    }

    // Attach media metadata
    const doneMedia = mediaFiles.filter((f) => f.status === "done");
    if (doneMedia.length > 0) {
      formData.set(
        "mediaItems",
        JSON.stringify(
          doneMedia.map((f) => ({
            storagePath: f.storagePath,
            publicUrl: f.publicUrl,
            mediaType: f.type,
            fileSizeBytes: f.fileSizeBytes,
            mimeType: f.mimeType,
            thumbnailUrl: f.thumbnailPublicUrl ?? f.thumbnailUrl,
            displayOrder: f.displayOrder,
            width: f.width,
            height: f.height,
          }))
        )
      );
    }

    const result = await createPost(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result && "success" in result && result.placeholderId) {
      // Placeholder post — redirect to success page with SMS prompt
      const params = new URLSearchParams({
        placeholder: result.placeholderId,
        post: result.postId,
      });
      router.push(`/create/success?${params.toString()}`);
    }
    // For real user posts, createPost calls redirect("/") so we won't reach here
  }

  const subjectLength = subject.length;
  const bodyLength = displayBody.length;
  const hasMedia = mediaFiles.some((f) => f.status === "done");
  const hasText = subject.trim().length > 0 || displayBody.trim().length > 0;
  const canSubmit =
    targetHandle.length > 0 &&
    (hasText || hasMedia) &&
    !loading &&
    !isUploading;

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
                {targetIsPlaceholder ? (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    (not on Spill)
                  </span>
                ) : targetDisplayName ? (
                  <span className="text-zinc-500 dark:text-zinc-400">
                    ({targetDisplayName})
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={clearTarget}
                  className="ml-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 active:opacity-60"
                  aria-label="Remove target"
                >
                  &times;
                </button>
              </span>
            </div>
          ) : showPhoneInput ? (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
                />
                {phoneChecking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
                  </div>
                )}
              </div>

              {phoneResult?.type === "existing" && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    This person is already on Spill as{" "}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      @{phoneResult.handle}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetHandle(phoneResult.handle!);
                      setTargetDisplayName(null);
                      setShowPhoneInput(false);
                      setPhoneNumber("");
                      setPhoneResult(null);
                    }}
                    className="mt-2 text-sm font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
                  >
                    Select @{phoneResult.handle}
                  </button>
                </div>
              )}

              {phoneResult?.type === "available" && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="mb-2 text-sm text-zinc-700 dark:text-zinc-300">
                    This person isn&apos;t on Spill yet. Post about them anyway?
                  </p>
                  <button
                    type="button"
                    onClick={selectPhoneTarget}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 active:scale-[0.97] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Post about phone_{phoneNumber.replace(/\D/g, "").slice(-4)}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleBackToSearch}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                &larr; Back to search
              </button>
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
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800 dark:active:bg-zinc-700"
                      >
                        <Avatar src={user.avatar_url} alt={`@${user.handle}`} size="xs" />
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

              {showTargetPicker && targetResults.length === 0 && targetQuery.length >= 2 && (
                <div className="mt-2 text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Can&apos;t find who you&apos;re looking for?
                  </p>
                  <button
                    type="button"
                    onClick={handlePhoneInputStart}
                    className="mt-1.5 text-sm font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
                  >
                    Post about someone not on Spill
                  </button>
                </div>
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
              Subject{hasMedia ? <span className="ml-1 font-normal text-zinc-400 dark:text-zinc-500">(optional)</span> : null}
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
              Spill it{hasMedia ? <span className="ml-1 font-normal text-zinc-400 dark:text-zinc-500">(optional)</span> : null}
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
          <div className="relative">
            <MentionAutocomplete
              textareaRef={bodyRef}
              value={displayBody}
              onInsertMention={handleBodyMention}
            />
            <textarea
              id="body"
              ref={bodyRef}
              placeholder="Write your confession..."
              value={displayBody}
              onChange={handleBodyChange}
              rows={5}
              className="min-h-[120px] w-full resize-none rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Media picker */}
        {currentUserId && (
          <MediaPicker
            mediaFiles={mediaFiles}
            onAddFiles={addMediaFiles}
            onRemoveFile={removeMediaFile}
            error={mediaError}
          />
        )}

        {/* Anonymous toggle */}
        <div>
          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isAnonymous}
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors active:scale-[0.95] ${
                isAnonymous
                  ? "bg-zinc-900 dark:bg-zinc-100"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-900 ${
                  isAnonymous ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Post anonymously
            </span>
          </label>
          {!isAnonymous && currentUserHandle && (
            <p className="mt-1.5 ml-14 text-xs text-zinc-500 dark:text-zinc-400">
              Your handle <span className="font-medium">@{currentUserHandle}</span> will be visible
            </p>
          )}
        </div>

        {/* Expiration toggle */}
        <div>
          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={expires}
              onClick={() => setExpires(!expires)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors active:scale-[0.95] ${
                expires
                  ? "bg-zinc-900 dark:bg-zinc-100"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-900 ${
                  expires ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Auto-delete after...
            </span>
          </label>

          {expires && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={720}
                value={expiresInHours}
                onChange={(e) =>
                  setExpiresInHours(
                    Math.max(1, Math.min(720, Number(e.target.value) || 1))
                  )
                }
                className="w-20 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                hours
              </span>
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white transition-all duration-150 hover:bg-zinc-800 active:scale-[0.97] disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Posting..." : isUploading ? "Uploading media..." : "Post"}
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
