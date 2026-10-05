// Safe degraded mode for when Meta/Instagram API access is blocked
// (OAuthException code 200 "API access blocked"). While blocked, the pipeline
// keeps rendering and maintaining the queue but holds the Instagram publish
// step: due reels are preserved (status WAITING_FOR_META_ACCESS) instead of
// being marked FAILED, a cheap read-only check looks for recovery on every
// run, and on recovery the held reels are re-slotted on the normal 4-hour
// cadence - never burst-posted. See content-library/META-ACCESS.md.

export const META_HOLD_STATUS = "WAITING_FOR_META_ACCESS";
export const RECOVERY_SLOT_HOURS = 4;
const FIRST_SLOT_DELAY_MINUTES = 15;
const RECOVERY_CHECK_INTERVAL_MINUTES = 30; // matches the workflow's cron cadence

export function isMetaAccessBlockedError(err) {
  const msg = typeof err === "string" ? err : err?.message || "";
  return /API access blocked/i.test(msg) && /"code"\s*:\s*200\b/.test(msg);
}

export function ensureMetaState(state) {
  if (!state.metaAccess) {
    state.metaAccess = {
      status: "HEALTHY",
      blockedSince: null,
      lastError: null,
      lastCheck: null,
      nextCheck: null,
      lastRecoveredAt: null,
      recoveryProof: null,
      events: [],
    };
  }
  return state.metaAccess;
}

export function waitingReels(state) {
  return state.reels.filter((r) => r.status === META_HOLD_STATUS);
}

function logEvent(meta, event) {
  meta.events.push(event);
  if (meta.events.length > 50) meta.events.splice(0, meta.events.length - 50);
}

export function markBlocked(state, errMessage, now = new Date()) {
  const meta = ensureMetaState(state);
  const iso = now.toISOString();
  if (meta.status !== "BLOCKED") {
    meta.status = "BLOCKED";
    meta.blockedSince = iso;
    logEvent(meta, { at: iso, type: "BLOCKED", error: String(errMessage).slice(0, 400) });
  }
  meta.lastError = String(errMessage).slice(0, 600);
  meta.lastCheck = iso;
  meta.nextCheck = new Date(now.getTime() + RECOVERY_CHECK_INTERVAL_MINUTES * 60000).toISOString();
  return meta;
}

// Preserves everything about the reel (concept, rendered file, caption,
// music, hash, original schedule) and only changes its lifecycle fields.
export function holdReel(reel, errMessage, now = new Date()) {
  const iso = now.toISOString();
  reel.originalScheduledTime = reel.originalScheduledTime || reel.scheduledTime;
  if (reel.status === "FAILED" && reel.error && !reel.originalError) reel.originalError = reel.error;
  reel.status = META_HOLD_STATUS;
  reel.instagramStatus = META_HOLD_STATUS;
  reel.blockedReason = "META_ACCESS_BLOCKED";
  reel.blockedAt = reel.blockedAt || iso;
  reel.recoveryStatus = META_HOLD_STATUS;
  reel.error = null;
  reel.lastModifiedAt = iso;
  return reel;
}

// Held reels (oldest original slot first) followed by any still-SCHEDULED
// reels, re-slotted consecutively every 4h starting shortly after recovery.
// One reel per slot, so recovery can never burst-post the backlog.
export function rescheduleAfterRecovery(state, now = new Date()) {
  const pending = state.reels
    .filter((r) => r.status === META_HOLD_STATUS || r.status === "SCHEDULED")
    .sort(
      (a, b) =>
        new Date(a.originalScheduledTime || a.scheduledTime) - new Date(b.originalScheduledTime || b.scheduledTime)
    );
  let slot = new Date(now.getTime() + FIRST_SLOT_DELAY_MINUTES * 60000);
  const iso = now.toISOString();
  for (const reel of pending) {
    const from = reel.scheduledTime;
    reel.originalScheduledTime = reel.originalScheduledTime || from;
    reel.scheduleHistory = reel.scheduleHistory || [];
    reel.scheduleHistory.push({ from, to: slot.toISOString(), at: iso, reason: "meta-access-recovery" });
    reel.scheduledTime = slot.toISOString();
    reel.newScheduledTime = reel.scheduledTime;
    if (reel.status === META_HOLD_STATUS) {
      reel.status = "SCHEDULED";
      reel.instagramStatus = "PENDING";
      reel.recoveryStatus = "RESCHEDULED";
      reel.recoveredAt = iso;
    }
    reel.lastModifiedAt = iso;
    state.lastScheduledTime = reel.scheduledTime;
    slot = new Date(slot.getTime() + RECOVERY_SLOT_HOURS * 3600000);
  }
  return pending.length;
}
