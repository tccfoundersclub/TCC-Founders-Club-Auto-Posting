import fs from "node:fs";
import path from "node:path";
import { loadState, futureQueue, dueReels, availableBankConcepts } from "../src/remoteState.js";

const LIB = "content-library";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

// Builds one canonical view per concept ID: if a reel exists for it, the
// reel (the rendered/scheduled/published instance) is the current source of
// truth for status and schedule; otherwise it's still just a bank concept
// waiting to be picked up.
function sourceFileFor(batchId) {
  if (batchId === "MANUAL") return "content-history.json (pre-pipeline manual publish)";
  if (batchId === "FALLBACK") return "src/fallbackConcepts.js";
  if (batchId === "UNKNOWN" || !batchId) return "(unknown)";
  return `scripts/${batchId.toLowerCase().replace("batch-", "content-batch-")}.js`;
}

function buildConceptViews(state) {
  const reelByConceptId = new Map(state.reels.map((r) => [r.conceptId, r]));
  const views = [];

  for (const bankEntry of state.contentBank) {
    const reel = reelByConceptId.get(bankEntry.conceptId);
    if (reel) continue; // rendered - represented via the reel below instead
    views.push({
      conceptId: bankEntry.conceptId,
      batchId: bankEntry.batchId,
      status: bankEntry.status,
      topic: bankEntry.topic,
      hook: bankEntry.hook,
      context: bankEntry.context,
      points: bankEntry.points,
      caption: bankEntry.caption,
      cta: bankEntry.cta,
      contentHash: bankEntry.contentHash,
      musicUsed: null,
      background: null,
      scheduledTime: null,
      reelId: null,
      mediaUrl: null,
      instagramResult: null,
      revision: bankEntry.revision || 1,
      createdAt: bankEntry.addedAt,
      lastModifiedAt: bankEntry.lastModifiedAt || bankEntry.addedAt,
      sourceFile: sourceFileFor(bankEntry.batchId),
    });
  }

  for (const reel of state.reels) {
    views.push({
      conceptId: reel.conceptId,
      batchId: reel.batchId,
      status: reel.status,
      topic: reel.topic,
      hook: reel.hook,
      context: reel.context,
      points: reel.points,
      caption: reel.caption,
      cta: reel.cta,
      contentHash: reel.contentHash,
      musicUsed: reel.musicUsed,
      background: "assets/bg-tcc-with-nasheed.mp4",
      scheduledTime: reel.scheduledTime,
      reelId: reel.reelId,
      mediaUrl: reel.mediaUrl,
      instagramResult: reel.instagramResult,
      revision: reel.revision || 1,
      createdAt: reel.createdAt,
      lastModifiedAt: reel.lastModifiedAt || reel.createdAt,
      sourceFile: sourceFileFor(reel.batchId),
      error: reel.error,
    });
  }

  views.sort((a, b) => a.conceptId.localeCompare(b.conceptId));
  return views;
}

function writeConceptFile(view) {
  const p = path.join(LIB, "concepts", `${view.conceptId}.md`);
  const points = view.points.map((pt, i) => `POINT ${i + 1}:\n${pt}\n`).join("\n");
  const content = `CONCEPT ID:
${view.conceptId}

BATCH:
${view.batchId || "-"}

STATUS:
${view.status}

TOPIC:
${view.topic}

HOOK:
${view.hook}

INTRO:
${view.context}

${points}
CAPTION:
${view.caption}

CTA:
${view.cta}

MUSIC:
${view.musicUsed || "-"}

BACKGROUND:
${view.background || "-"}

CONTENT HASH:
${view.contentHash}

CREATED:
${fmtDate(view.createdAt)}

LAST MODIFIED:
${fmtDate(view.lastModifiedAt)}

REVISION:
${view.revision}

RELATED RENDER:
${view.reelId || "(not yet rendered)"}

SCHEDULED TIME:
${view.scheduledTime ? fmtDate(view.scheduledTime) : "-"}

PUBLISHED MEDIA:
${view.instagramResult || "-"}

SOURCE FILE:
${view.sourceFile}

NOTES:
${view.error ? `Error: ${view.error}` : "-"}
`;
  fs.writeFileSync(p, content);
}

function writeBatchFiles(state) {
  const byBatch = new Map();
  const allViews = buildConceptViews(state);
  for (const v of allViews) {
    if (!v.batchId) continue;
    if (!byBatch.has(v.batchId)) byBatch.set(v.batchId, []);
    byBatch.get(v.batchId).push(v);
  }
  const rejectedByBatch = new Map();
  for (const r of state.rejectedLog) {
    if (!rejectedByBatch.has(r.batchId)) rejectedByBatch.set(r.batchId, []);
    rejectedByBatch.get(r.batchId).push(r);
  }

  const allBatchIds = new Set([...byBatch.keys(), ...rejectedByBatch.keys()]);
  for (const batchId of allBatchIds) {
    const concepts = (byBatch.get(batchId) || []).sort((a, b) => a.conceptId.localeCompare(b.conceptId));
    const rejected = rejectedByBatch.get(batchId) || [];
    const lines = [
      `# ${batchId}`,
      ``,
      `Accepted: ${concepts.length}`,
      `Rejected: ${rejected.length}`,
      ``,
      `## Accepted concepts`,
      ``,
      ...concepts.map((c) => `- **${c.conceptId}** [${c.status}] - ${c.hook}`),
      ``,
      `## Rejected`,
      ``,
      ...(rejected.length
        ? rejected.map((r) => `- "${r.hook}" - ${r.reason}${r.similarTo ? ` of ${r.similarTo}` : ""}`)
        : ["(none)"]),
      ``,
    ];
    fs.writeFileSync(path.join(LIB, "batches", `${batchId}.md`), lines.join("\n"));
  }
}

function writeRejected(state) {
  const lines = [
    `# Rejected Concepts`,
    ``,
    `Total rejected: ${state.rejectedLog.length}`,
    ``,
    ...state.rejectedLog.map(
      (r, i) =>
        `## ${i + 1}. "${r.hook}"\n\n- Batch: ${r.batchId}\n- Reason: ${r.reason}\n- Similar to: ${r.similarTo || "-"}\n- Rejected at: ${fmtDate(r.rejectedAt)}\n`
    ),
  ];
  fs.writeFileSync(path.join(LIB, "REJECTED.md"), lines.join("\n"));
}

function writeSchedule(state) {
  const future = futureQueue(state);
  const due = dueReels(state);
  const lines = [
    `# Schedule`,
    ``,
    `Future queue: ${future.length} (target 20)`,
    due.length ? `\n**${due.length} reel(s) currently due for publishing.**\n` : "",
    ``,
    ...[...due, ...future].map(
      (r, i) =>
        `${String(i + 1).padStart(2, "0")}.\n${r.conceptId} - ${r.hook}\n${fmtDate(r.scheduledTime)}\nMusic: ${r.musicUsed}\nStatus: ${r.status}\n`
    ),
  ];
  fs.writeFileSync(path.join(LIB, "SCHEDULE.md"), lines.join("\n"));
}

function writePublished(state) {
  const published = state.reels
    .filter((r) => r.status === "PUBLISHED")
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const lines = [
    `# Published`,
    ``,
    `Total published: ${published.length}`,
    ``,
    ...published.map(
      (r) =>
        `## ${r.conceptId} - ${r.hook}\n\n- Published: ${fmtDate(r.publishedAt)}\n- Instagram: ${r.instagramResult || "(not recorded)"}\n- Music: ${r.musicUsed}\n- Caption: see content-library/concepts/${r.conceptId}.md\n`
    ),
  ];
  fs.writeFileSync(path.join(LIB, "PUBLISHED.md"), lines.join("\n"));
}

function writeIndex(state) {
  const views = buildConceptViews(state);
  const rows = views.map(
    (v) =>
      `| ${v.conceptId} | ${v.batchId || "-"} | ${v.status} | ${v.topic} | ${v.hook.slice(0, 60)}${v.hook.length > 60 ? "..." : ""} | ${v.scheduledTime ? fmtDate(v.scheduledTime) : "-"} | ${v.reelId || "-"} | ${v.instagramResult ? "yes" : "-"} | ${v.revision} |`
  );
  const lines = [
    `# TCC Founders Club - Content Library Index`,
    ``,
    `Auto-generated by \`scripts/generate-content-library.js\` from the live Supabase pipeline state. Do not edit this file directly - it will be overwritten.`,
    ``,
    `Total concepts tracked: ${views.length}`,
    ``,
    `| Concept ID | Batch | Status | Topic | Hook | Scheduled | Reel ID | Published | Rev |`,
    `|---|---|---|---|---|---|---|---|---|`,
    ...rows,
  ];
  fs.writeFileSync(path.join(LIB, "INDEX.md"), lines.join("\n"));
  return views;
}

function writeStatus(state, views) {
  const available = views.filter((v) => v.status === "AVAILABLE").length;
  const queued = views.filter((v) => v.status === "QUEUED").length;
  const scheduled = views.filter((v) => v.status === "SCHEDULED").length;
  const published = views.filter((v) => v.status === "PUBLISHED").length;
  const failed = views.filter((v) => v.status === "FAILED").length;
  const rejected = state.rejectedLog.length;
  const future = futureQueue(state);
  const nextReel = future[0];
  const lastReel = future[future.length - 1];

  let nextAction;
  if (future.length < 20) {
    nextAction = `Replenish queue (${future.length}/20) from the content bank - runs automatically every 30 min via GitHub Actions, or manually via \`node scripts/run-reel-pipeline.js\`.`;
  } else if (available < 60) {
    nextAction = `Content bank is below the 60-concept comfort threshold (${available} available) - write and ingest another batch via scripts/content-batch-N.js + scripts/add-to-content-bank.js.`;
  } else {
    nextAction = `Queue is full (20/20) and the bank is healthy (${available} available) - no action needed, pipeline runs unattended.`;
  }

  const lines = [
    `# TCC Founders Club - Automation Status`,
    ``,
    `Auto-generated by \`scripts/generate-content-library.js\`. Do not edit directly.`,
    ``,
    `TOTAL CONCEPTS: ${views.length}`,
    ``,
    `AVAILABLE: ${available}`,
    `QUEUED: ${queued}`,
    `SCHEDULED: ${scheduled}`,
    `PUBLISHED: ${published}`,
    `FAILED: ${failed}`,
    `REJECTED (never got an ID): ${rejected}`,
    ``,
    `CONTENT BANK TARGET: 360`,
    `CONTENT BANK CURRENT (available + queued + scheduled + published, i.e. all non-rejected): ${views.length}`,
    ``,
    `CURRENT FUTURE QUEUE: ${future.length}`,
    `QUEUE TARGET: 20`,
    ``,
    `NEXT REEL: ${nextReel ? `${nextReel.conceptId} - ${fmtDate(nextReel.scheduledTime)}` : "(none scheduled)"}`,
    `LAST SCHEDULED REEL: ${lastReel ? `${lastReel.conceptId} - ${fmtDate(lastReel.scheduledTime)}` : "(none scheduled)"}`,
    ``,
    `NEXT ACTION: ${nextAction}`,
    ``,
    `AUTOMATION HEALTH: ${failed > 0 ? `${failed} reel(s) FAILED and need manual review (see INDEX.md)` : "OK - no failed reels"}`,
    ``,
    `Anthropic/paid LLM dependency: REMOVED - production path uses only the content bank + zero-cost fallback reserve.`,
  ];
  fs.writeFileSync(path.join(LIB, "STATUS.md"), lines.join("\n"));
}

function writeSystemMap() {
  const content = `# TCC Founders Club - System Map

Plain-English explanation of every script in the automation, and how they connect.

## Workflow

\`\`\`
CONTENT CONCEPT (hand-written batch, or zero-cost fallback bank)
  |
  v
DUPLICATE CHECK (exact hash + semantic hook-overlap)          -- scripts/add-to-content-bank.js
  |
  v
CONTENT BANK (state.contentBank, status AVAILABLE)            -- src/remoteState.js
  |
  v
QUEUE REPLENISHMENT (when future queue <= 16)                 -- src/reelPipeline.js (replenish)
  |
  v
MUSIC SELECTION (never same as previous reel)                 -- src/reelPipeline.js (pickNextMusic)
  |
  v
BACKGROUND SELECTION (Supabase-hosted source video)            -- src/mediaLibrary.js
  |
  v
10-SECOND RENDER (ffmpeg, locked TCC Founders Club template)   -- src/media.js (compileMultiClipReel)
  |
  v
VALIDATION (measured duration must be 10.000s +/- 0.08s)       -- src/reelPipeline.js (probeDuration)
  |
  v
SCHEDULE (4 hours after the previous scheduled reel)           -- src/reelPipeline.js (replenish)
  |
  v
INSTAGRAM PUBLISH (primary - the only success condition)       -- src/reelPipeline.js (publishDue), src/social.js
  |
  v
THREADS MIRROR (secondary, optional, isolated - see PLATFORMS.md) -- src/threadsCaption.js, src/social.js
  |
  v
PUBLISHED HISTORY (permanent, never deleted)                    -- state.reels, content-library/PUBLISHED.md
\`\`\`

Facebook is disabled - see \`content-library/PLATFORMS.md\`.

## Scripts

FILE: src/remoteState.js
PURPOSE: Reads/writes the single persistent JSON state blob (queue, full reel history, content bank, rejected log, music rotation) to Supabase Storage. This is the one source of truth every GitHub Actions run reads and writes.
INPUT: SUPABASE_URL, SUPABASE_SECRET_KEY
OUTPUT: state object { reels, contentBank, rejectedLog, nextConceptId, lastMusicPath, lastScheduledTime }
WHAT IT MODIFIES: state/reel-pipeline-state.json in the Supabase "content" bucket
WHAT DEPENDS ON IT: reelPipeline.js, add-to-content-bank.js, backfill-concept-ids.js, generate-content-library.js

FILE: src/reelPipeline.js
PURPOSE: The orchestrator. Publishes any due reel, then replenishes the queue from the content bank (falling back to the small FALLBACK_CONCEPTS reserve) until it's back to 20, entirely without any paid API call.
INPUT: remote state, Supabase-hosted background video + music, content bank
OUTPUT: rendered reels uploaded to Supabase, updated state
WHAT IT MODIFIES: state.reels, state.contentBank (marks concepts QUEUED/REJECTED), state.lastMusicPath, state.lastScheduledTime
WHAT DEPENDS ON IT: scripts/run-reel-pipeline.js (the GitHub Actions entrypoint)

FILE: scripts/run-reel-pipeline.js
PURPOSE: Thin CLI entrypoint that GitHub Actions runs on a schedule. Calls reelPipeline.js and prints a summary.
INPUT: none (env vars only)
OUTPUT: console summary
WHAT IT MODIFIES: nothing directly - delegates to reelPipeline.js
WHAT DEPENDS ON IT: .github/workflows/reel-pipeline.yml

FILE: scripts/add-to-content-bank.js
PURPOSE: Validates a hand-written batch of concepts, rejects exact/semantic duplicates against everything that already exists (published, queued, scheduled, in-bank), assigns each accepted concept a permanent TCCFC-#### ID, and merges them into the remote content bank. Prints a full terminal summary.
INPUT: path to a batch module (e.g. scripts/content-batch-6.js) whose default export is an array of concepts
OUTPUT: terminal summary (accepted/rejected with reasons)
WHAT IT MODIFIES: state.contentBank, state.rejectedLog, state.nextConceptId
WHAT DEPENDS ON IT: nothing (run manually/interactively when adding new content)

FILE: scripts/backfill-concept-ids.js
PURPOSE: One-off migration that assigned TCCFC-#### IDs retroactively to everything created before the ID system existed, and imported the 5 manually-published reels from the old local content-history.json into the remote state. Already run once - safe to leave in the repo, not part of the regular workflow.
INPUT: live remote state + local content-history.json
OUTPUT: updated remote state
WHAT IT MODIFIES: state.contentBank, state.reels, state.nextConceptId
WHAT DEPENDS ON IT: nothing (historical, one-time use)

FILE: scripts/generate-content-library.js
PURPOSE: Reads the live remote state and regenerates every file under content-library/ (INDEX.md, STATUS.md, SCHEDULE.md, PUBLISHED.md, REJECTED.md, one concepts/TCCFC-####.md per concept, one batches/BATCH-##.md per batch). This file (SYSTEM-MAP.md) is written by the same script but its content is static/hand-authored.
INPUT: live remote state
OUTPUT: content-library/ directory tree
WHAT IT MODIFIES: local files only (content-library/**) - never touches Supabase
WHAT DEPENDS ON IT: nothing (run manually after any change to review the current state, or after ingesting a new batch)

FILE: scripts/migrate-media-to-supabase.js
PURPOSE: One-off migration that uploaded the approved background video (compressed to fit Supabase's 50MB limit) and both music tracks to Supabase Storage. Already run once.
INPUT: local media files under "Videos folder/"
OUTPUT: public Supabase Storage URLs (recorded in src/mediaLibrary.js)
WHAT IT MODIFIES: Supabase Storage content/assets/*
WHAT DEPENDS ON IT: nothing (historical, one-time use)

FILE: src/mediaLibrary.js
PURPOSE: Points at the Supabase-hosted background video and music library (the URLs scripts/migrate-media-to-supabase.js produced), so the GitHub Actions runner never needs any file from a laptop.
INPUT: none (static config, reads SUPABASE_URL for the base path)
OUTPUT: BACKGROUND_VIDEO, MUSIC_LIBRARY
WHAT DEPENDS ON IT: reelPipeline.js

FILE: src/fallbackConcepts.js
PURPOSE: A small (8-concept) zero-cost reserve, used only if the content bank is ever completely exhausted. Nothing here costs money or calls any API.
WHAT DEPENDS ON IT: reelPipeline.js (last resort in replenish())

FILE: src/contentHistory.js
PURPOSE: The pure content-hashing function (contentHash) used everywhere duplicate detection happens. Also has a legacy local-file-based history reader/writer (readHistory/isDuplicate/recordPublished) used only by the older one-off manual-publish scripts (scripts/post-reel-founder-*.js) - not used by the remote pipeline, which uses the Supabase-backed state instead.
WHAT DEPENDS ON IT: reelPipeline.js, add-to-content-bank.js (contentHash only)

FILE: src/social.js
PURPOSE: Publishes a rendered reel to Instagram and Threads via the Meta Graph API, polling until each platform reports the upload actually finished processing before publishing it. postToInstagram also posts a required music-license attribution as the first comment right after publish (see the Music licensing audit section below) - never in the caption itself. Also contains postToFacebookPage, kept but unused - see PLATFORMS.md.
WHAT DEPENDS ON IT: reelPipeline.js (publishDue)

FILE: src/threadsCaption.js
PURPOSE: Generates Threads' own native text from a concept's structured fields (hook/points/cta) - never the Instagram caption truncated - and validates it against Threads' 500-character limit before it's ever sent to the API. See PLATFORMS.md.
INPUT: a concept/reel object (hook, points, cta)
OUTPUT: buildThreadsText() -> string (<=500 chars); validateThreadsText() -> { valid, errors }
WHAT DEPENDS ON IT: reelPipeline.js (publishDue)

FILE: src/media.js
PURPOSE: The ffmpeg wrapper - builds the TCC Founders Club visual template(s) and compiles the multi-clip crossfade reel to an exact requested duration. The live renderer uses buildTccReelStyleTemplate (sequential hook -> insight -> CTA, driven entirely by content-library/styles/tcc-reel-style.v1.json - see content-library/STYLE.md); the older buildYellowTemplateFilters (simultaneous hook/context/points info-card) is kept working but unused, for rollback.
WHAT DEPENDS ON IT: reelPipeline.js (renderConcept)

FILE: src/styleConfig.js
PURPOSE: Loads and validates content-library/styles/tcc-reel-style.v1.json (the single source of truth for reel font sizes/weights/colors/coordinates - see content-library/STYLE.md) and resolves a font pairing + role to a bundled .ttf path under assets/fonts/, throwing rather than silently substituting a missing font.
WHAT DEPENDS ON IT: src/media.js (buildTccReelStyleTemplate), src/reelPipeline.js (renderConcept)

FILE: src/hashtags.js
PURPOSE: Builds each reel's caption hashtags (topic-aware, capped at 5 per Instagram's Dec 2025 rule - see content-library/HASHTAGS.md) and sanitizes captions to strip any production/licensing metadata (music credits, filenames, license text) as a defense-in-depth check, even though that content is no longer added to captions in the first place.
INPUT: a concept object (topic/hook/context) and its conceptId
OUTPUT: selectHashtags() -> array of up to 5 hashtags; sanitizeCaption() -> cleaned caption text
WHAT DEPENDS ON IT: reelPipeline.js (buildFullCaption)

## Music licensing audit (2026-09-29)

Both approved tracks are Creative Commons licensed:
- "Powerful" by MaxKoMusic - CC BY-SA 3.0 - **ATTRIBUTION_REQUIRED**
- "Powerful Trap Beat" by Alex-Productions - CC BY 3.0 - **ATTRIBUTION_REQUIRED**

Both licenses legally require attribution wherever the work is used. That's a real license term - it cannot be silently dropped just to get a cleaner caption.

**2026-09-29 resolution (superseded below):** attribution was posted as an automated Instagram comment immediately after the reel publishes (\`src/social.js\`'s \`postToInstagram(..., commentText)\` param). This satisfied the CC license's attribution requirement ("reasonably associated with the work") without putting production metadata in the caption.

**2026-10-02 update:** the attribution comment is now DISABLED BY USER REQUEST. \`publishDue()\` no longer passes \`commentText\` to \`postToInstagram\` at all - \`src/social.js\` still supports it (unused, kept for future re-enable), and \`reel.musicCredit\` is still recorded on each reel as metadata, but nothing posts it anywhere.

**Compliance note, left open on purpose:** both tracks' licenses (CC BY-SA / CC BY) still legally require attribution wherever the work is used, and right now neither the caption nor a comment provides it. This is a known gap, not an oversight - flagged here so it's visible rather than silently dropped. Options if this needs closing later: credit in the Instagram bio/link-in-bio page (a one-time, not-per-post location), switch to tracks that don't require attribution, or re-enable the comment. No action taken without being asked.

Any future track must go through this same audit before being added to \`src/mediaLibrary.js\`.

## Caption & hashtag system (2026-09-29)

Captions built by \`buildFullCaption()\` in reelPipeline.js now contain **content only**: the hand-written caption text, a blank line, then up to 5 topic-matched hashtags. No music credit, no filenames, no license text, no production/automation notes ever appear in the caption - see content-library/HASHTAGS.md and content-library/KEYWORDS.md for the full research and category breakdown.

## Manual/one-off publish scripts (2026-09-30 rule)

Never trust a manual script's local success as proof of an Instagram publish. A reel may only reach \`status: "PUBLISHED"\` / \`instagramStatus: "PUBLISHED"\` after Instagram actually confirms it - at minimum an \`instagramMediaId\`, and preferably a permalink and a real API success response. This rule exists because of a real incident: five reels (TCCFC-0128 through TCCFC-0132) were found marked \`PUBLISHED\` by one-off scripts (\`manual-backfill\`, \`post-reel-founder-loneliness.js\`, \`post-reel-founder-circle.js\`) with no such evidence for three of them. See \`scripts/audit-manual-reels.js\` for the correction and content-library/PLATFORMS.md for the full account. Any future manual test script should write an intermediate status (\`MANUAL_TEST\`, \`PUBLISHING\`, \`PENDING_VERIFICATION\`) and only promote to \`PUBLISHED\` once Instagram confirms it.

## .github/workflows/reel-pipeline.yml

Runs \`node scripts/run-reel-pipeline.js\` every 30 minutes on GitHub's own infrastructure (not this laptop). Publishes any due reel, then replenishes the queue from the content bank if it's dropped to 16 or below. No Anthropic/OpenAI/paid API key required or used.

## .github/workflows/post.yml

The old pipeline (Google Drive inbox + generic captions). Its automatic schedule has been disabled (workflow_dispatch only) so it can't publish to the same Instagram account alongside the new pipeline.

## Remotion rendering layer (optional, not yet wired into production)

A React/Remotion-based visual renderer lives under \`remotion/\` as a parallel, additive capability alongside the ffmpeg renderer in src/media.js - see REMOTION.md for the full architecture, props schema, and component list. It is NOT currently called by reelPipeline.js; the live pipeline still renders every reel through ffmpeg exactly as before. Remotion exists for concepts that benefit from data visualization (charts, animated metrics) the ffmpeg template can't represent. License: free for TCC Founders Club at its current headcount (≤ 3 employees) - re-verify at remotion.dev/docs/license/pricing before relying on it if that changes.
`;
  fs.writeFileSync(path.join(LIB, "SYSTEM-MAP.md"), content);
}

async function main() {
  ensureDir(LIB);
  ensureDir(path.join(LIB, "concepts"));
  ensureDir(path.join(LIB, "batches"));
  ensureDir(path.join(LIB, "rejected"));

  const state = await loadState();
  const views = writeIndex(state);
  writeStatus(state, views);
  writeSchedule(state);
  writePublished(state);
  writeRejected(state);
  writeBatchFiles(state);
  writeSystemMap();
  for (const v of views) writeConceptFile(v);

  console.log(`Content library regenerated: ${views.length} concept files, ${state.rejectedLog.length} rejected entries logged.`);
}

main().catch((err) => {
  console.error("generate-content-library failed:", err);
  process.exit(1);
});
