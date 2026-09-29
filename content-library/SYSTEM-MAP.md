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
INSTAGRAM / FACEBOOK / THREADS PUBLISHING (when due)            -- src/reelPipeline.js (publishDue), src/social.js
  |
  v
PUBLISHED HISTORY (permanent, never deleted)                    -- state.reels, content-library/PUBLISHED.md
```

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
PURPOSE: Publishes a rendered reel to Instagram, Facebook Page, and Threads via the Meta Graph API, polling until each platform reports the upload actually finished processing before publishing it.
WHAT DEPENDS ON IT: reelPipeline.js (publishDue)

FILE: src/media.js
PURPOSE: The ffmpeg wrapper - builds the locked TCC Founders Club visual template (white/black branding, rounded panels, centered text) and compiles the multi-clip crossfade reel to an exact requested duration.
WHAT DEPENDS ON IT: reelPipeline.js (renderConcept)

## .github/workflows/reel-pipeline.yml

Runs `node scripts/run-reel-pipeline.js` every 30 minutes on GitHub's own infrastructure (not this laptop). Publishes any due reel, then replenishes the queue from the content bank if it's dropped to 16 or below. No Anthropic/OpenAI/paid API key required or used.

## .github/workflows/post.yml

The old pipeline (Google Drive inbox + generic captions). Its automatic schedule has been disabled (workflow_dispatch only) so it can't publish to the same Instagram account alongside the new pipeline.
