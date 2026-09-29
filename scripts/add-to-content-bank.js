import path from "node:path";
import { loadState, saveState, assignConceptId } from "../src/remoteState.js";
import { contentHash } from "../src/contentHistory.js";

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
function tokenSet(text) {
  return new Set(normalize(text).split(" ").filter(Boolean));
}
function jaccard(a, b) {
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function batchIdFromPath(batchPath) {
  const base = path.basename(batchPath, path.extname(batchPath));
  const match = base.match(/(\d+)/);
  const num = match ? match[1].padStart(2, "0") : "XX";
  return `BATCH-${num}`;
}

// Merges a batch of hand-written concepts into the remote, zero-cost content
// bank (Supabase-hosted state.contentBank), assigning each a permanent
// TCCFC-#### id, rejecting exact-hash and semantic (hook token-overlap)
// duplicates against everything already published, queued, or already
// sitting in the bank - and keeping a visible, reasoned record of every
// rejection in state.rejectedLog (see content-library/REJECTED.md). Usage:
//   node scripts/add-to-content-bank.js path/to/batch.js
// where the batch file's default export is an array of
// { topic, hook, context, points, caption, cta }.
async function main() {
  const batchPath = process.argv[2];
  if (!batchPath) {
    console.error("Usage: node scripts/add-to-content-bank.js <path-to-batch-module.js>");
    process.exit(1);
  }
  const batchId = batchIdFromPath(batchPath);
  const mod = await import(new URL(batchPath, `file://${process.cwd()}/`).href);
  const batch = mod.default;
  if (!Array.isArray(batch)) throw new Error("Batch module's default export must be an array");

  const state = await loadState();
  // { hookTokens, conceptId } for every existing hook, across reels + bank,
  // so later concepts in this same batch also get checked against earlier
  // ones just accepted in this run.
  const existing = [
    ...state.reels.map((r) => ({ id: r.conceptId || r.reelId, hook: r.hook })),
    ...state.contentBank.map((c) => ({ id: c.conceptId, hook: c.hook })),
  ].map((e) => ({ ...e, tokens: tokenSet(e.hook) }));
  const existingHashes = new Map([
    ...state.reels.map((r) => [r.contentHash, r.conceptId || r.reelId]),
    ...state.contentBank.map((c) => [c.contentHash, c.conceptId]),
  ]);

  const accepted = [];
  const rejected = [];

  for (const concept of batch) {
    const hash = contentHash(concept);
    if (existingHashes.has(hash)) {
      rejected.push({ concept, reason: "exact duplicate", similarTo: existingHashes.get(hash) });
      continue;
    }
    const hookTokens = tokenSet(concept.hook);
    const semanticMatch = existing.find((e) => jaccard(e.tokens, hookTokens) >= 0.6);
    if (semanticMatch) {
      rejected.push({ concept, reason: "semantic duplicate", similarTo: semanticMatch.id });
      continue;
    }

    const conceptId = assignConceptId(state);
    const entry = {
      conceptId,
      batchId,
      topic: concept.topic,
      hook: concept.hook,
      context: concept.context,
      points: concept.points,
      caption: concept.caption,
      cta: concept.cta,
      contentHash: hash,
      status: "AVAILABLE",
      revision: 1,
      addedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
    };
    state.contentBank.push(entry);
    existing.push({ id: conceptId, hook: concept.hook, tokens: hookTokens });
    existingHashes.set(hash, conceptId);
    accepted.push(entry);
  }

  for (const r of rejected) {
    state.rejectedLog.push({
      batchId,
      hook: r.concept.hook,
      topic: r.concept.topic,
      reason: r.reason,
      similarTo: r.similarTo,
      rejectedAt: new Date().toISOString(),
    });
  }

  await saveState(state);

  console.log(`\n========================================`);
  console.log(`TCC FOUNDERS CLUB`);
  console.log(`CONTENT ${batchId}`);
  console.log(`========================================\n`);
  console.log(`Generated: ${batch.length}`);
  console.log(`Accepted: ${accepted.length}`);
  console.log(`Rejected: ${rejected.length}\n`);

  console.log(`ACCEPTED CONCEPTS\n`);
  for (const c of accepted) {
    console.log(`${c.conceptId}`);
    console.log(`Topic: ${c.topic}`);
    console.log(`Hook: ${c.hook}`);
    console.log(`Status: ${c.status}\n`);
  }

  if (rejected.length) {
    console.log(`REJECTED CONCEPTS\n`);
    for (const r of rejected) {
      console.log(`(unassigned - rejected before an ID was given)`);
      console.log(`Hook: ${r.concept.hook}`);
      console.log(`Reason: ${r.reason}${r.similarTo ? ` of ${r.similarTo}` : ""}\n`);
    }
  }
  console.log(`========================================\n`);

  console.log(`Content bank now has ${state.contentBank.filter((c) => c.status === "AVAILABLE").length} AVAILABLE concepts.`);
}

main().catch((err) => {
  console.error("add-to-content-bank failed:", err);
  process.exit(1);
});
