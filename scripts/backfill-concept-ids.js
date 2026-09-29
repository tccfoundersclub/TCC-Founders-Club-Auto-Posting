import fs from "node:fs";
import { loadState, saveState, assignConceptId } from "../src/remoteState.js";

// One-off migration: assigns permanent TCCFC-#### IDs to every concept
// created before the ID system existed (the first 5 content-bank batches
// and the 20 reels already rendered from them), and imports the 5 reels
// published manually earlier in this project (tracked only in the local
// content-history.json) into the same remote state so the content library
// and duplicate-protection system has one complete, single-sourced history.
// Safe to run once; does nothing destructive to anything already correct.

// Exact merge order used when these were ingested, so batch attribution can
// be reconstructed even though the original (pre-ID) ingestion script didn't
// record it: batch-1 (42), batch-2 (23), batch-3 (16), batch-4 (18), batch-5 (20).
const BATCH_BOUNDARIES = [
  { end: 42, id: "BATCH-01" },
  { end: 65, id: "BATCH-02" },
  { end: 81, id: "BATCH-03" },
  { end: 99, id: "BATCH-04" },
  { end: 119, id: "BATCH-05" },
];
function batchForIndex(i) {
  return BATCH_BOUNDARIES.find((b) => i < b.end)?.id || "BATCH-UNKNOWN";
}

// Manually recorded Instagram permalinks for the two most recent manual
// publishes (posted earlier this session, confirmed live). The first three
// were published in an earlier stretch of the project and their permalinks
// were never recorded in content-history.json - left null rather than
// guessed.
const KNOWN_MANUAL_PERMALINKS = {
  "170a819e252a79f9": "https://www.instagram.com/p/17875349691576674/",
  "9f02e12cefff9779": "https://www.instagram.com/p/18110433395350760/",
};

async function main() {
  const state = await loadState();
  let bankIdsAssigned = 0;
  let reelsLinked = 0;
  let reelsAssignedFresh = 0;
  let manualImported = 0;

  // 1. Content bank entries: assign a TCCFC id + batchId to any entry that
  // doesn't already have one (i.e. still has the old "bank-<ts>-<rand>" id).
  state.contentBank.forEach((c, i) => {
    if (c.conceptId && c.conceptId.startsWith("TCCFC-")) return;
    c.conceptId = assignConceptId(state);
    c.batchId = batchForIndex(i);
    c.revision = c.revision || 1;
    c.lastModifiedAt = c.lastModifiedAt || c.addedAt || new Date().toISOString();
    bankIdsAssigned++;
  });

  // 2. Reels: link to the matching bank entry by contentHash (same concept,
  // later lifecycle stage) where one exists; otherwise (fallback-sourced
  // reels with no bank entry) assign a fresh id directly to the reel.
  for (const r of state.reels) {
    if (r.conceptId) continue;
    const match = state.contentBank.find((c) => c.contentHash === r.contentHash);
    if (match) {
      r.conceptId = match.conceptId;
      r.batchId = match.batchId;
      reelsLinked++;
    } else {
      r.conceptId = assignConceptId(state);
      r.batchId = r.source === "fallback" ? "FALLBACK" : "UNKNOWN";
      reelsAssignedFresh++;
    }
  }

  // 3. Import the 5 manually-published reels from the local
  // content-history.json (predates the remote pipeline entirely) so they
  // exist in the same traceable, single-sourced history.
  const localHistory = JSON.parse(fs.readFileSync("content-history.json", "utf8"));
  for (const h of localHistory) {
    if (state.reels.some((r) => r.contentHash === h.contentHash)) continue; // already present
    const conceptId = assignConceptId(state);
    state.reels.push({
      reelId: h.reelId,
      conceptId,
      batchId: "MANUAL",
      topic: h.topic,
      hook: h.hook,
      context: h.intro,
      points: h.points,
      caption: h.caption,
      cta: h.cta,
      contentHash: h.contentHash,
      musicUsed: h.musicUsed,
      mediaUrl: null,
      scheduledTime: h.date,
      status: "PUBLISHED",
      source: h.source,
      createdAt: h.date,
      publishedAt: h.date,
      instagramResult: KNOWN_MANUAL_PERMALINKS[h.contentHash] || null,
      facebookResult: null,
      threadsResult: null,
      error: null,
      revision: 1,
      lastModifiedAt: h.date,
    });
    manualImported++;
  }

  await saveState(state);
  console.log(`Bank entries assigned new IDs: ${bankIdsAssigned}`);
  console.log(`Reels linked to existing bank concept: ${reelsLinked}`);
  console.log(`Reels assigned a fresh ID (fallback-sourced, no bank entry): ${reelsAssignedFresh}`);
  console.log(`Manual historical reels imported: ${manualImported}`);
  console.log(`nextConceptId now: ${state.nextConceptId}`);
}

main().catch((err) => {
  console.error("backfill-concept-ids failed:", err);
  process.exit(1);
});
