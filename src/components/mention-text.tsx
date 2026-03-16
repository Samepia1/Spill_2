"use client";

import Link from "next/link";
import { parseMentions } from "@/lib/mentions";

type MentionTextProps = {
  text: string;
  className?: string;
};

function handleAnonClick(anonNumber: string) {
  const el = document.querySelector(`[data-anon-number="${anonNumber}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export default function MentionText({ text, className }: MentionTextProps) {
  const mentions = parseMentions(text);

  if (mentions.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const segments: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < mentions.length; i++) {
    const mention = mentions[i];

    // Plain text before this mention
    if (mention.index > cursor) {
      segments.push(
        <span key={`text-${i}`}>{text.slice(cursor, mention.index)}</span>
      );
    }

    // Render the mention
    if (mention.type === "user") {
      segments.push(
        <Link
          key={`mention-${i}`}
          href={"/profile/" + mention.id}
          className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          @{mention.label}
        </Link>
      );
    } else {
      segments.push(
        <button
          key={`mention-${i}`}
          type="button"
          onClick={() => handleAnonClick(mention.id)}
          className="font-semibold text-violet-600 dark:text-violet-400 hover:underline"
        >
          @{mention.label}
        </button>
      );
    }

    cursor = mention.index + mention.fullMatch.length;
  }

  // Trailing plain text after last mention
  if (cursor < text.length) {
    segments.push(<span key="text-tail">{text.slice(cursor)}</span>);
  }

  return <span className={className}>{segments}</span>;
}
