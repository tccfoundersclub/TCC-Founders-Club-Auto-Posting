// One-off correction, 2026-09-30. Five reels (TCCFC-0128 through
// TCCFC-0132) were found marked PUBLISHED outside the normal pipeline
// (batchId "MANUAL", written by one-off scripts: manual-backfill,
// post-reel-founder-loneliness.js, post-reel-founder-circle.js). None had a
// contentBank entry, so their status could never be trusted against real
// publish evidence the way state.contentBank concepts can.
//
// Verification performed before this script was written:
// - TCCFC-0128, TCCFC-0129, TCCFC-0130: mediaUrl is null and instagramResult
//   is null - no video was ever rendered or uploaded for these, so no
//   Instagram publish could have happened. No evidence found anywhere.
// - TCCFC-0131, TCCFC-0132: recorded permalinks used the wrong URL format
//   (/p/{numeric-id}/, which Instagram serves as "not available" - the real
//   format is /reel/{shortcode}/). Queried the Instagram Graph API directly
//   for both media IDs (GET /{id}?fields=id,permalink,timestamp,media_type)
//   using the project's own production IG_ACCESS_TOKEN - both IDs resolved
//   to real, live video posts. CONFIRMED genuinely published.
//
// Run once: node --env-file=.env scripts/audit-manual-reels.js
import { loadState, saveState } from "../src/remoteState.js";

const NO_EVIDENCE = ["TCCFC-0128", "TCCFC-0129", "TCCFC-0130"];
const CONFIRMED = {
  "TCCFC-0131": { mediaId: "17875349691576674", permalink: "https://www.instagram.com/reel/Dd3vx6kjSEE/", timestamp: "2026-09-29T12:21:17+0000" },
  "TCCFC-0132": { mediaId: "18110433395350760", permalink: "https://www.instagram.com/reel/Dd3wnlHjxon/", timestamp: "2026-09-29T12:28:36+0000" },
};

async function main() {
  const state = await loadState();
  const now = new Date().toISOString();

  for (const conceptId of NO_EVIDENCE) {
    const reel = state.reels.find((r) => r.conceptId === conceptId);
    if (!reel) {
      console.log(`${conceptId}: not found in state.reels, skipping`);
      continue;
    }

    reel.status = "VOID_NO_EVIDENCE";
    reel.instagramStatus = "VOID_NO_EVIDENCE";
    reel.auditNote = "Previously incorrectly marked published by manual backfill; no Instagram publication evidence found. Voided and concept restored to content bank for real production. Audited 2026-09-30.";
    reel.correctedAt = now;
    reel.lastModifiedAt = now;

    const alreadyRestored = state.contentBank.some((c) => c.conceptId === conceptId);
    if (!alreadyRestored) {
      state.contentBank.push({
        conceptId,
        topic: reel.topic,
        hook: reel.hook,
        context: reel.context,
        points: reel.points,
        caption: reel.caption,
        cta: reel.cta,
        contentHash: reel.contentHash,
        status: "AVAILABLE",
        addedAt: now,
        batchId: "AUDIT-RESTORED",
        auditNote: `Restored from voided reel record ${reel.reelId} (originally marked published by manual-backfill with no evidence). Audited 2026-09-30.`,
        revision: 1,
        lastModifiedAt: now,
      });
      console.log(`${conceptId}: voided reel, restored concept to content bank as AVAILABLE`);
    } else {
      console.log(`${conceptId}: voided reel (bank entry already exists, left as-is)`);
    }
  }

  for (const [conceptId, evidence] of Object.entries(CONFIRMED)) {
    const reel = state.reels.find((r) => r.conceptId === conceptId);
    if (!reel) {
      console.log(`${conceptId}: not found in state.reels, skipping`);
      continue;
    }
    reel.instagramMediaId = evidence.mediaId;
    reel.instagramPermalink = evidence.permalink;
    reel.instagramResult = evidence.permalink;
    reel.instagramPublishedAt = new Date(evidence.timestamp).toISOString();
    reel.instagramStatus = "PUBLISHED";
    reel.status = "PUBLISHED";
    reel.threadsStatus = reel.threadsResult ? reel.threadsStatus || "PUBLISHED" : "NOT_ATTEMPTED";
    reel.auditNote = `Confirmed genuinely published via direct Instagram Graph API query on media ID ${evidence.mediaId} (correct permalink format backfilled - the /p/{id}/ format originally recorded does not resolve for numeric media IDs). Audited 2026-09-30.`;
    reel.correctedAt = now;
    reel.lastModifiedAt = now;
    console.log(`${conceptId}: confirmed published, backfilled instagramMediaId/instagramPermalink -> ${evidence.permalink}`);
  }

  await saveState(state);
  console.log("\nState saved.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
