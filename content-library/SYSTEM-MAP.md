# TCC Founders Club - System Map

Plain-English explanation of every script in the automation, and how they connect.

## Workflow

```
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
```

Facebook is disabled - see `content-library/PLATFORMS.md`.

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

**2026-09-29 resolution (superseded below):** attribution was posted as an automated Instagram comment immediately after the reel publishes (`src/social.js`'s `postToInstagram(..., commentText)` param). This satisfied the CC license's attribution requirement ("reasonably associated with the work") without putting production metadata in the caption.

**2026-10-02 update:** the attribution comment is now DISABLED BY USER REQUEST. `publishDue()` no longer passes `commentText` to `postToInstagram` at all - `src/social.js` still supports it (unused, kept for future re-enable), and `reel.musicCredit` is still recorded on each reel as metadata, but nothing posts it anywhere.

**Compliance note, left open on purpose:** both tracks' licenses (CC BY-SA / CC BY) still legally require attribution wherever the work is used, and right now neither the caption nor a comment provides it. This is a known gap, not an oversight - flagged here so it's visible rather than silently dropped. Options if this needs closing later: credit in the Instagram bio/link-in-bio page (a one-time, not-per-post location), switch to tracks that don't require attribution, or re-enable the comment. No action taken without being asked.

Any future track must go through this same audit before being added to `src/mediaLibrary.js`.

## Caption & hashtag system (2026-09-29)

Captions built by `buildFullCaption()` in reelPipeline.js now contain **content only**: the hand-written caption text, a blank line, then up to 5 topic-matched hashtags. No music credit, no filenames, no license text, no production/automation notes ever appear in the caption - see content-library/HASHTAGS.md and content-library/KEYWORDS.md for the full research and category breakdown.

## Manual/one-off publish scripts (2026-09-30 rule)

Never trust a manual script's local success as proof of an Instagram publish. A reel may only reach `status: "PUBLISHED"` / `instagramStatus: "PUBLISHED"` after Instagram actually confirms it - at minimum an `instagramMediaId`, and preferably a permalink and a real API success response. This rule exists because of a real incident: five reels (TCCFC-0128 through TCCFC-0132) were found marked `PUBLISHED` by one-off scripts (`manual-backfill`, `post-reel-founder-loneliness.js`, `post-reel-founder-circle.js`) with no such evidence for three of them. See `scripts/audit-manual-reels.js` for the correction and content-library/PLATFORMS.md for the full account. Any future manual test script should write an intermediate status (`MANUAL_TEST`, `PUBLISHING`, `PENDING_VERIFICATION`) and only promote to `PUBLISHED` once Instagram confirms it.

## Meta access safe mode (2026-10-05)

If Meta returns OAuthException 200 "API access blocked", the pipeline enters safe mode: Instagram publishing is held, due reels are preserved as WAITING_FOR_META_ACCESS (never FAILED), a read-only check runs every pipeline run, and on recovery held reels are re-slotted one per 4 hours with no burst. See content-library/META-ACCESS.md and src/metaAccess.js.

## .github/workflows/reel-pipeline.yml

Runs `node scripts/run-reel-pipeline.js` every 30 minutes on GitHub's own infrastructure (not this laptop). Publishes any due reel, then replenishes the queue from the content bank if it's dropped to 16 or below. No Anthropic/OpenAI/paid API key required or used.

## .github/workflows/post.yml

The old pipeline (Google Drive inbox + generic captions). Its automatic schedule has been disabled (workflow_dispatch only) so it can't publish to the same Instagram account alongside the new pipeline.

## Remotion rendering layer (optional, not yet wired into production)

A React/Remotion-based visual renderer lives under `remotion/` as a parallel, additive capability alongside the ffmpeg renderer in src/media.js - see REMOTION.md for the full architecture, props schema, and component list. It is NOT currently called by reelPipeline.js; the live pipeline still renders every reel through ffmpeg exactly as before. Remotion exists for concepts that benefit from data visualization (charts, animated metrics) the ffmpeg template can't represent. License: free for TCC Founders Club at its current headcount (≤ 3 employees) - re-verify at remotion.dev/docs/license/pricing before relying on it if that changes.
