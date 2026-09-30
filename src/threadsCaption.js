// Threads gets its own native text - generated from the same structured
// concept fields (hook/points/cta) as the Instagram caption, never the
// Instagram caption text itself truncated. Threads is the secondary
// platform: Instagram is the source of truth and must never be blocked or
// affected by anything that happens here. See publishDue() in
// reelPipeline.js for the isolation boundary.
import { METADATA_LINE_PATTERN, METADATA_KEYWORD_PATTERN } from "./hashtags.js";

export const THREADS_MAX_CHARACTERS = 500;
const THREADS_TARGET_MAX = 470;

// Cuts at the last sentence boundary within budget rather than mid-sentence;
// falls back to a word boundary + ellipsis only if no sentence break fits.
function truncateToSentence(text, maxLen) {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastEnd = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (lastEnd > maxLen * 0.4) return slice.slice(0, lastEnd + 1).trim();
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

// HOOK -> 1-2 short insight lines (from concept.points) -> CTA. No
// hashtags by default (matches the existing hand-written `threads` voice in
// captions.js's THEMES bank - conversational, not a mirrored IG post) and
// never the giant IG hashtag block.
export function buildThreadsText(concept) {
  const hook = (concept.hook || "").trim();
  const points = (concept.points || []).filter(Boolean);
  const cta = (concept.cta || "").trim();

  const assemble = (numPoints) => {
    const body = points.slice(0, numPoints).join("\n\n");
    return [hook, body, cta].filter(Boolean).join("\n\n");
  };

  let text = assemble(2);
  if (text.length > THREADS_TARGET_MAX) text = assemble(1);
  if (text.length > THREADS_TARGET_MAX) text = assemble(0);
  if (text.length > THREADS_TARGET_MAX) {
    const ctaBudget = cta ? cta.length + 2 : 0;
    const hookBudget = Math.max(THREADS_TARGET_MAX - ctaBudget, 60);
    text = [truncateToSentence(hook, hookBudget), cta].filter(Boolean).join("\n\n");
  }
  return text;
}

export function validateThreadsText(text) {
  const errors = [];
  if (!text || !text.trim()) errors.push("empty");
  if (text && text.length > THREADS_MAX_CHARACTERS) errors.push(`exceeds ${THREADS_MAX_CHARACTERS} characters (${text.length})`);
  if (text && /(#\S+\s*){4,}/.test(text)) errors.push("hashtag block too large for Threads (max 3)");
  if (text && text.split("\n").some((line) => METADATA_LINE_PATTERN.test(line.trim()))) errors.push("contains production/licensing metadata line");
  if (text && METADATA_KEYWORD_PATTERN.test(text)) errors.push("contains production/licensing metadata keyword");
  return { valid: errors.length === 0, errors };
}
