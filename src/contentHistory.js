import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = path.join(__dirname, "..", "content-history.json");

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

// Hash covers hook + intro + points, deliberately excluding the caption/CTA
// (those legitimately repeat the same closing line across reels - it's the
// core on-screen message that must be genuinely new each time).
export function contentHash({ hook, context, points }) {
  const normalized = [normalize(hook), normalize(context), ...points.map(normalize)].join("|");
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export function readHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
}

function writeHistory(entries) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(entries, null, 2), "utf8");
}

// Exact-hash duplicate check. Semantic near-duplicate judgment (Step 11/21 -
// "same post reworded") is a qualitative call made when drafting the topic,
// not something this function can decide - it only catches literal repeats.
export function isDuplicate({ hook, context, points }) {
  const hash = contentHash({ hook, context, points });
  return readHistory().some((e) => e.contentHash === hash);
}

export function recordPublished({ topic, hook, context, points, caption, cta, musicUsed, source }) {
  const entries = readHistory();
  const entry = {
    reelId: `reel-${Date.now()}`,
    date: new Date().toISOString(),
    topic,
    hook,
    intro: context,
    points,
    caption,
    cta,
    musicUsed,
    source: source || null,
    contentHash: contentHash({ hook, context, points }),
  };
  entries.push(entry);
  writeHistory(entries);
  return entry;
}
