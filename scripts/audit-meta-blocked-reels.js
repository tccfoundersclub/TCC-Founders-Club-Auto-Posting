// One-off, idempotent migration (2026-10-05): reels the live pipeline marked
// FAILED purely because Meta returned OAuthException 200 "API access blocked"
// were never published (the error came back on the very first call, creating
// the media container) and never lost their rendered file. They are moved
// into the recoverable WAITING_FOR_META_ACCESS state with their original
// schedule/error kept, and the global metaAccess state is set to BLOCKED so
// the pipeline's safe mode takes over. Run: node --env-file=.env scripts/audit-meta-blocked-reels.js
import { loadState, saveState } from "../src/remoteState.js";
import { ensureMetaState, holdReel, isMetaAccessBlockedError, markBlocked } from "../src/metaAccess.js";

const state = await loadState();
const now = new Date();
const affected = state.reels.filter((r) => r.status === "FAILED" && isMetaAccessBlockedError(r.error));
for (const r of affected) {
  if (r.instagramMediaId || r.instagramResult) throw new Error(`${r.conceptId} has Instagram publish evidence - refusing to requeue`);
  if (!r.mediaUrl) throw new Error(`${r.conceptId} has no rendered file`);
  const firstBlockedAt = r.scheduledTime; // the run that hit the error happened at/after the scheduled slot
  r.originalError = r.error;
  holdReel(r, r.originalError, now);
  r.blockedAt = firstBlockedAt;
  r.auditNote = "Marked FAILED only because Meta returned OAuthException 200 'API access blocked' on container creation; never published, rendered file and concept preserved. Moved to WAITING_FOR_META_ACCESS by the 2026-10-05 safe-mode migration. Will be re-slotted at the 4h cadence after access recovers.";
}
if (affected.length) {
  const meta = ensureMetaState(state);
  markBlocked(state, affected.at(-1).originalError, now);
  meta.blockedSince = affected[0].blockedAt; // earliest known failure
}
await saveState(state);
console.log(`Held ${affected.length} reels: ${affected.map((r) => r.conceptId).join(", ")}`);
console.log(`metaAccess: ${JSON.stringify({ ...state.metaAccess, events: undefined })}`);
