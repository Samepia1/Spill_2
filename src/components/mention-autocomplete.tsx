"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Avatar from "@/components/avatar";
import { searchMentionUsers } from "@/app/actions";

export type ThreadParticipant = {
  label: string;
  type: "anon" | "user";
  id: string;
  avatarUrl: string | null;
  isAnonymous: boolean;
};

type MentionAutocompleteProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onInsertMention: (
    mention: { label: string; type: "user" | "anon"; id: string },
    atIndex: number,
    queryLength: number
  ) => void;
  threadParticipants?: ThreadParticipant[];
};

type MentionItem = {
  label: string;
  type: "user" | "anon";
  id: string;
  avatarUrl: string | null;
  isAnonymous: boolean;
  section: "thread" | "global";
};

function getActiveQuery(
  text: string,
  cursorPos: number
): { query: string; atIndex: number } | null {
  let i = cursorPos - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === "@") {
      const query = text.slice(i + 1, cursorPos);
      if (i === 0 || /\s/.test(text[i - 1])) {
        return { query, atIndex: i };
      }
      return null;
    }
    if (/\s/.test(ch)) return null;
    i--;
  }
  return null;
}

export default function MentionAutocomplete({
  textareaRef,
  value,
  onInsertMention,
  threadParticipants,
}: MentionAutocompleteProps) {
  const [cursorPos, setCursorPos] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [globalResults, setGlobalResults] = useState<
    Array<{
      id: string;
      handle: string;
      display_name: string | null;
      avatar_url: string | null;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update cursor position from textarea events
  const updateCursorPos = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      setCursorPos(textarea.selectionStart ?? 0);
    }
  }, [textareaRef]);

  // Attach event listeners to the textarea for cursor tracking
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handler = () => updateCursorPos();
    textarea.addEventListener("keyup", handler);
    textarea.addEventListener("click", handler);
    textarea.addEventListener("select", handler);

    return () => {
      textarea.removeEventListener("keyup", handler);
      textarea.removeEventListener("click", handler);
      textarea.removeEventListener("select", handler);
    };
  }, [textareaRef, updateCursorPos]);

  // Also update when value changes
  useEffect(() => {
    updateCursorPos();
  }, [value, updateCursorPos]);

  const activeQuery = getActiveQuery(value, cursorPos);

  // Filter thread participants
  const filteredParticipants: MentionItem[] =
    activeQuery && threadParticipants
      ? threadParticipants
          .filter((p) =>
            p.label.toLowerCase().includes(activeQuery.query.toLowerCase())
          )
          .map((p) => ({
            label: p.label,
            type: p.type,
            id: p.id,
            avatarUrl: p.avatarUrl,
            isAnonymous: p.isAnonymous,
            section: "thread" as const,
          }))
      : [];

  // Debounced global search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!activeQuery || activeQuery.query.length < 1) {
      setGlobalResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const result = await searchMentionUsers(activeQuery.query);
      if ("data" in result) {
        setGlobalResults(result.data);
      } else {
        setGlobalResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuery?.query]);

  const globalItems: MentionItem[] = globalResults.map((u) => ({
    label: u.handle,
    type: "user" as const,
    id: u.handle,
    avatarUrl: u.avatar_url,
    isAnonymous: false,
    section: "global" as const,
  }));

  const allItems = [...filteredParticipants, ...globalItems];

  // Reset highlighted index when items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [allItems.length]);

  // Handle selection
  const selectItem = useCallback(
    (item: MentionItem) => {
      if (!activeQuery) return;
      onInsertMention(
        { label: item.label, type: item.type, id: item.id },
        activeQuery.atIndex,
        activeQuery.query.length + 1 // +1 for the @ character
      );
    },
    [activeQuery, onInsertMention]
  );

  // Keyboard handler — attached to textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handler = (e: KeyboardEvent) => {
      if (!activeQuery || allItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < allItems.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : allItems.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[highlightedIndex];
        if (item) {
          selectItem(item);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        // Move cursor to dismiss the query by blurring and refocusing
        textarea.blur();
        textarea.focus();
      }
    };

    textarea.addEventListener("keydown", handler);
    return () => textarea.removeEventListener("keydown", handler);
  }, [textareaRef, activeQuery, allItems, highlightedIndex, selectItem]);

  // Don't render if no active query or no items and not searching
  if (!activeQuery || (allItems.length === 0 && !isSearching)) {
    return null;
  }

  const hasThreadSection = filteredParticipants.length > 0;
  const hasGlobalSection = globalItems.length > 0 || isSearching;
  const showThreadHeader = hasThreadSection && threadParticipants && threadParticipants.length > 0;

  let itemIndex = -1;

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      {showThreadHeader && (
        <>
          <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            In this thread
          </div>
          {filteredParticipants.map((item) => {
            itemIndex++;
            const idx = itemIndex;
            return (
              <button
                key={`thread-${item.id}`}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  highlightedIndex === idx
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent textarea blur
                  selectItem(item);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <Avatar
                  src={item.avatarUrl}
                  alt={item.label}
                  isAnonymous={item.isAnonymous}
                  size="xs"
                />
                <span className="truncate text-zinc-900 dark:text-zinc-100">
                  {item.type === "user" ? "@" : ""}{item.label}
                </span>
              </button>
            );
          })}
        </>
      )}

      {hasGlobalSection && (
        <>
          <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {showThreadHeader ? "All users" : "Users"}
          </div>
          {globalItems.map((item) => {
            itemIndex++;
            const idx = itemIndex;
            return (
              <button
                key={`global-${item.id}`}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  highlightedIndex === idx
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(item);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <Avatar
                  src={item.avatarUrl}
                  alt={item.label}
                  isAnonymous={false}
                  size="xs"
                />
                <span className="truncate text-zinc-900 dark:text-zinc-100">
                  @{item.label}
                </span>
                {globalResults.find((u) => u.handle === item.id)
                  ?.display_name && (
                  <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {
                      globalResults.find((u) => u.handle === item.id)!
                        .display_name
                    }
                  </span>
                )}
              </button>
            );
          })}
          {isSearching && globalItems.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-400 dark:text-zinc-500">
              Searching...
            </div>
          )}
        </>
      )}

      {allItems.length === 0 && !isSearching && (
        <div className="px-3 py-2 text-sm text-zinc-400 dark:text-zinc-500">
          No results
        </div>
      )}
    </div>
  );
}
