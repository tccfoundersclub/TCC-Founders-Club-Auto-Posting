# Platform priority (2026-09-30)

PRIMARY: Instagram
SECONDARY: Threads
DISABLED: Facebook - DISABLED BY USER REQUEST

## Instagram - primary, source of truth

Every production reel must succeed on Instagram first. Instagram publishing is never blocked by anything else - not a Facebook token issue, not a Threads character-limit failure, not any other secondary-platform API error.

Pipeline order (`publishDue()` in `src/reelPipeline.js`):

```
RENDER -> VALIDATE -> PUBLISH TO INSTAGRAM -> VERIFY -> MARK PUBLISHED -> optionally mirror to Threads
```

A reel only becomes `status: "PUBLISHED"` / `instagramStatus: "PUBLISHED"` after Instagram's API confirms it (a real media ID at minimum). Nothing that happens afterward - a Threads failure, a validation warning - can ever revert that.

## Facebook - disabled

Facebook is removed from the active production path. `src/reelPipeline.js` no longer calls `postToFacebookPage` at all. The function itself is left in `src/social.js`, isolated and unused, in case it's ever re-enabled. No token refresh, no retries, no blocking on Facebook failures.

## Threads - secondary, native text, isolated

Threads gets its own text, generated from the concept's structured fields (hook + 1-2 points from `points[]` + cta) via `buildThreadsText()` in `src/threadsCaption.js` - never the Instagram caption truncated. Structure:

```
HOOK

1-2 short insight lines

CTA
```

No large hashtag block - 0 hashtags by default (matches the hand-written `threads` voice already used in `src/captions.js`'s THEMES bank), conversational and human rather than a mirrored IG post.

**Character safety.** Hard limit `THREADS_MAX_CHARACTERS = 500`, internal target `THREADS_TARGET_MAX = 470` to leave headroom. `buildThreadsText()` never truncates mid-sentence to hit the limit - it progressively drops from 2 insight lines to 1 to 0, and only as a last resort trims the hook itself at the last sentence boundary within budget. `validateThreadsText()` re-checks the actual character count, hashtag density, and absence of any production/licensing metadata immediately before the Threads API call; a failed reel never reaches `postToThreads`.

**Isolation.** If Instagram publishes and Threads fails or fails validation, `reel.status` stays `"PUBLISHED"` (Instagram succeeded) and only `threadsStatus` becomes `"THREADS_FAILED"` with the error recorded on `threadsError`. Instagram is never unpublished, never reposted, and no duplicate Instagram content is ever created because Threads had a problem.

## Platform-specific state fields

Each reel tracks Instagram and Threads separately - never one generic `status` standing in for both:

```
instagramStatus        PENDING | PUBLISHED | FAILED | VOID_NO_EVIDENCE
instagramMediaId
instagramPermalink
instagramPublishedAt

threadsStatus           PENDING | PUBLISHED | THREADS_FAILED | NOT_ATTEMPTED
threadsPostId
threadsPublishedAt
threadsError
```

`reel.status` remains the top-level field the rest of the pipeline (`dueReels`, `futureQueue`) filters on, and always mirrors `instagramStatus` (Instagram is the platform that determines whether a reel counts as produced).

## Manual publication evidence rule

See the "Manual/one-off publish scripts" section of `SYSTEM-MAP.md`. In short: a local script exiting successfully is never sufficient proof of a real Instagram publish. Only a confirmed Instagram media ID (and ideally permalink + timestamp from the Graph API) counts as evidence.

## 2026-09-30 manual-record audit

Five reels were found marked `PUBLISHED` outside the normal pipeline (`batchId: "MANUAL"`), predating this rule:

- **TCCFC-0128, TCCFC-0129, TCCFC-0130** - `mediaUrl` and `instagramResult` were both `null`: no video was ever rendered or uploaded, so no Instagram publish could have happened. No evidence found anywhere. Voided (`status: "VOID_NO_EVIDENCE"`) with the original record preserved, and the concept was restored to `state.contentBank` as `AVAILABLE` (`batchId: "AUDIT-RESTORED"`) so it re-enters the real pipeline and actually gets produced.
- **TCCFC-0131, TCCFC-0132** - had recorded permalinks in the wrong format (`/p/{numeric-id}/`, which Instagram serves as "not available" for numeric media IDs - the real format is `/reel/{shortcode}/`). Queried the Instagram Graph API directly for both media IDs using the project's own production token; both resolved to real, live video posts. Confirmed genuinely published - `instagramMediaId` and the correct `instagramPermalink` were backfilled.

See `scripts/audit-manual-reels.js` for the correction script (already run once).
