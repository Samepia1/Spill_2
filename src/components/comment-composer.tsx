"use client";

import { useTransition, useState, useRef, useCallback } from "react";
import MentionAutocomplete from "@/components/mention-autocomplete";
import type { ThreadParticipant } from "@/components/mention-autocomplete";
import { mentionToken, displayLength } from "@/lib/mentions";

type Props = {
  action: (body: string, isAnonymous: boolean) => Promise<{ error?: string; success?: boolean }>;
  identityMode: "anonymous" | "revealed" | "choose";
  userHandle: string;
  currentUserAnonNumber: number | null;
  threadParticipants?: ThreadParticipant[];
};

export default function CommentComposer({
  action,
  identityMode: initialMode,
  userHandle,
  currentUserAnonNumber,
  threadParticipants,
}: Props) {
  // displayBody: what user sees in textarea (e.g., "hey @Anon 2")
  // rawBody: what gets stored (e.g., "hey @[Anon 2](anon:2)")
  const [displayBody, setDisplayBody] = useState("");
  const [rawBody, setRawBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [chosenMode, setChosenMode] = useState<"anonymous" | "revealed" | null>(
    initialMode === "choose" ? null : initialMode
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track mention position offsets (display length vs raw length difference)
  // Each mention adds extra chars to raw that aren't in display
  const mentionsRef = useRef<Array<{ displayStart: number; displayEnd: number; rawToken: string; displayLabel: string }>>([]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplay = e.target.value;
    // Rebuild raw from display, preserving existing mentions
    // Simple approach: track offset difference between raw and display
    const diff = rawBody.length - displayBody.length;

    if (newDisplay.length < displayBody.length) {
      // Deletion: find what was removed and remove corresponding raw chars
      // If a mention was partially deleted, remove the whole mention token
      const deleteStart = e.target.selectionStart ?? 0;
      const charsRemoved = displayBody.length - newDisplay.length;

      // Check if any mention overlaps with the deleted range
      let newRaw = rawBody;
      let handled = false;
      const deleteEnd = deleteStart + charsRemoved;

      for (const m of mentionsRef.current) {
        if (deleteStart < m.displayEnd && deleteEnd > m.displayStart) {
          // Mention was partially or fully deleted — remove the whole token from raw
          // Calculate the raw position of this mention
          let rawOffset = 0;
          const tempDisplay = displayBody;
          let tempRaw = rawBody;

          // Find and remove the mention token from raw
          const tokenIndex = tempRaw.indexOf(m.rawToken);
          if (tokenIndex >= 0) {
            newRaw = tempRaw.slice(0, tokenIndex) + tempRaw.slice(tokenIndex + m.rawToken.length);
            // Also remove from display tracking
            mentionsRef.current = mentionsRef.current.filter(mm => mm !== m);
            handled = true;
            break;
          }
        }
      }

      if (!handled) {
        // Regular deletion — apply same deletion to raw at adjusted position
        const rawDeleteStart = displayToRawIndex(deleteStart);
        newRaw = rawBody.slice(0, rawDeleteStart) + rawBody.slice(rawDeleteStart + charsRemoved);
      }

      setRawBody(newRaw);
    } else if (newDisplay.length > displayBody.length) {
      // Insertion: find what was added and insert at same position in raw
      const insertPos = (e.target.selectionStart ?? newDisplay.length) - (newDisplay.length - displayBody.length);
      const inserted = newDisplay.slice(insertPos, insertPos + (newDisplay.length - displayBody.length));
      const rawInsertPos = displayToRawIndex(insertPos);
      const newRaw = rawBody.slice(0, rawInsertPos) + inserted + rawBody.slice(rawInsertPos);
      setRawBody(newRaw);
    }

    setDisplayBody(newDisplay);
    // Rebuild mention positions
    rebuildMentionPositions();
  }, [displayBody, rawBody]);

  function displayToRawIndex(displayIdx: number): number {
    // Walk through raw text and display text together, accounting for mention tokens
    let rawIdx = 0;
    let dispIdx = 0;
    const mentionRegex = /@\[([^\]]+)\]\((\w+):([^)]+)\)/g;
    let match;
    let lastRawEnd = 0;

    const matches: Array<{ rawStart: number; rawEnd: number; displayLen: number }> = [];
    while ((match = mentionRegex.exec(rawBody)) !== null) {
      matches.push({
        rawStart: match.index,
        rawEnd: match.index + match[0].length,
        displayLen: match[1].length + 1, // "@" + label
      });
    }

    for (const m of matches) {
      const plainBefore = m.rawStart - lastRawEnd;
      if (dispIdx + plainBefore >= displayIdx) {
        return lastRawEnd + (displayIdx - dispIdx);
      }
      dispIdx += plainBefore;
      rawIdx = m.rawStart;

      if (dispIdx + m.displayLen >= displayIdx) {
        // Inside a mention — map to end of raw token
        return m.rawEnd;
      }
      dispIdx += m.displayLen;
      lastRawEnd = m.rawEnd;
    }

    // After all mentions
    return lastRawEnd + (displayIdx - dispIdx);
  }

  function rebuildMentionPositions() {
    const regex = /@\[([^\]]+)\]\((\w+):([^)]+)\)/g;
    const newMentions: typeof mentionsRef.current = [];
    let match;
    let displayOffset = 0;
    let lastRawEnd = 0;

    while ((match = regex.exec(rawBody)) !== null) {
      const plainBefore = match.index - lastRawEnd;
      displayOffset += plainBefore;
      const displayLabel = `@${match[1]}`;
      newMentions.push({
        displayStart: displayOffset,
        displayEnd: displayOffset + displayLabel.length,
        rawToken: match[0],
        displayLabel,
      });
      displayOffset += displayLabel.length;
      lastRawEnd = match.index + match[0].length;
    }

    mentionsRef.current = newMentions;
  }

  const handleInsertMention = useCallback((
    mention: { label: string; type: "user" | "anon"; id: string },
    atIndex: number,
    queryLength: number
  ) => {
    const displayLabel = mention.type === "anon" ? mention.label : mention.label;
    const displayInsert = `@${displayLabel} `;
    const rawInsert = mentionToken(displayLabel, mention.type, mention.id) + " ";

    // Replace @query with mention in display
    const newDisplay = displayBody.slice(0, atIndex) + displayInsert + displayBody.slice(atIndex + queryLength);

    // Replace @query with raw token in raw
    const rawAtIndex = displayToRawIndex(atIndex);
    const newRaw = rawBody.slice(0, rawAtIndex) + rawInsert + rawBody.slice(rawAtIndex + queryLength);

    setDisplayBody(newDisplay);
    setRawBody(newRaw);

    // Restore focus and cursor position
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newCursor = atIndex + displayInsert.length;
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  }, [displayBody, rawBody]);

  function handleSubmit() {
    const trimmed = rawBody.trim();
    if (!trimmed || !chosenMode) return;
    if (displayLength(trimmed) > 300) return;

    setError(null);
    startTransition(async () => {
      const result = await action(trimmed, chosenMode === "anonymous");
      if (result.error) {
        setError(result.error);
      } else {
        setDisplayBody("");
        setRawBody("");
        mentionsRef.current = [];
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
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-all duration-150 hover:bg-zinc-50 active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Anonymously
          </button>
          <button
            onClick={() => setChosenMode("revealed")}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-all duration-150 hover:bg-zinc-50 active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
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

  const currentDisplayLength = displayBody.length;

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
        <div className="relative flex-1">
          <MentionAutocomplete
            textareaRef={textareaRef}
            value={displayBody}
            onInsertMention={handleInsertMention}
            threadParticipants={threadParticipants}
          />
          <textarea
            ref={textareaRef}
            value={displayBody}
            onChange={handleChange}
            rows={2}
            placeholder="Add a comment..."
            className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          />
          <div className="mt-1 text-right text-xs text-zinc-400 dark:text-zinc-500">
            {currentDisplayLength}/300
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isPending || !displayBody.trim() || currentDisplayLength > 300}
          className="mb-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-zinc-800 active:scale-[0.97] disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
