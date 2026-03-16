// Mention parsing utilities — shared between client and server
// Storage format: @[displayLabel](type:id)
// Examples: @[samuel](user:samuel), @[Anon 2](anon:2)

const MENTION_REGEX = /@\[([^\]]+)\]\((\w+):([^)]+)\)/g;

export type ParsedMention = {
  fullMatch: string;
  label: string;
  type: "user" | "anon";
  id: string;
  index: number;
};

/** Parse all mentions from raw text */
export function parseMentions(text: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  const regex = new RegExp(MENTION_REGEX.source, "g");
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      fullMatch: match[0],
      label: match[1],
      type: match[2] as "user" | "anon",
      id: match[3],
      index: match.index,
    });
  }
  return mentions;
}

/** Convert raw text (with tokens) to display text (just @label) */
export function displayText(text: string): string {
  return text.replace(MENTION_REGEX, "@$1");
}

/** Get the display length of raw text */
export function displayLength(text: string): number {
  return displayText(text).length;
}

/** Extract all mentioned user handles */
export function extractMentionedHandles(text: string): string[] {
  return parseMentions(text)
    .filter((m) => m.type === "user")
    .map((m) => m.id);
}

/** Extract all mentioned anon numbers */
export function extractMentionedAnonNumbers(text: string): number[] {
  return parseMentions(text)
    .filter((m) => m.type === "anon")
    .map((m) => parseInt(m.id, 10))
    .filter((n) => !isNaN(n));
}

/** Build anonymous identity map from post + comments (userId → anonNumber) */
export function buildAnonMap(
  postAuthorId: string,
  postIsAnonymous: boolean,
  comments: Array<{ author_user_id: string; is_anonymous: boolean }>
): Map<string, number> {
  const anonMap = new Map<string, number>();
  let anonCounter = 1;

  if (postIsAnonymous) {
    anonMap.set(postAuthorId, anonCounter++);
  }

  for (const comment of comments) {
    if (comment.is_anonymous && !anonMap.has(comment.author_user_id)) {
      anonMap.set(comment.author_user_id, anonCounter++);
    }
  }

  return anonMap;
}

/** Invert anonMap: anonNumber → userId */
export function invertAnonMap(
  anonMap: Map<string, number>
): Map<number, string> {
  const inverted = new Map<number, string>();
  for (const [userId, num] of anonMap) {
    inverted.set(num, userId);
  }
  return inverted;
}

/** Create a mention token string */
export function mentionToken(
  label: string,
  type: "user" | "anon",
  id: string
): string {
  return `@[${label}](${type}:${id})`;
}
