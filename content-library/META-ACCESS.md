# Meta API access: safe mode, recovery, and Trial Reel research

Last updated 2026-10-05. Current live status is in `STATUS.md` ("META API STATUS"), generated from the pipeline state.

## What happened

From about 2026-10-03 15:00 UTC every Instagram and Threads API call returns `OAuthException`, code 200, "API access blocked". An expired or invalid token would return code 190, so this is not a simple token expiry. Because both the Instagram and the Threads calls fail at the same time, the restriction is most likely on the Meta app or its developer/business account rather than on one token. This is an inference from the error pattern; the dashboards below confirm or refute it. Before the safe mode existed, the pipeline marked one reel FAILED every 4 hours (TCCFC-0017 to TCCFC-0028, 12 reels).

## Safe mode (live since 2026-10-05)

Code: `src/metaAccess.js`, `publishDue()` in `src/reelPipeline.js`, `checkMetaAccess()` in `src/social.js`. Tests: `test/meta-safe-mode.test.mjs`.

- The pipeline and the GitHub workflow keep running. Rendering, queue maintenance, duplicate protection and content-bank growth are unchanged.
- The blocked error is META_ACCESS_BLOCKED, not a reel failure. Due reels become `WAITING_FOR_META_ACCESS` with concept ID, rendered file, caption, music, hash and `originalScheduledTime` preserved. Nothing is marked FAILED and no new Instagram media is created while blocked.
- Every pipeline run (every 30 min) does one read-only check: `GET /me` (identity) and `GET /{IG_USER_ID}/content_publishing_limit` (the publishing-quota endpoint). No media is uploaded and no publishing quota is used.
- Held reels count toward the queue size (20), so a block does not consume content-bank concepts.
- On recovery the check must confirm the token works, the authenticated user matches `IG_USER_ID`, and the publishing endpoint answers. Then status becomes HEALTHY, a recovery proof is stored in `state.metaAccess.recoveryProof`, and all unpublished reels are re-slotted one per 4 hours starting about 15 minutes later, oldest original slot first. They are never burst-posted, and each keeps `originalScheduledTime`, `scheduleHistory`, `blockedAt`, `originalError` and `recoveryStatus`.
- Threads stays secondary and isolated. Facebook stays disabled and is not part of health.

## Audit of TCCFC-0017 to TCCFC-0028 (2026-10-05)

All 12 had the blocked error on the very first call (creating the media container), no Instagram media ID or result, and a rendered file. None was published. They are now `WAITING_FOR_META_ACCESS` with `originalError`, `blockedAt` and an audit note, and will be re-slotted on recovery (`scripts/audit-meta-blocked-reels.js`).

## ACTION REQUIRED FROM ATHAR

Only you can see these screens. Do not change anything yet; just tell me what each says.

1. Open https://developers.facebook.com/apps and log in as the account that owns the app.
2. Open the app used for the TCC automation. If you are not sure which one, tell me the app names you see.
3. Look at the top of the app dashboard and the bell/alerts icon. Tell me whether you see any banner or alert (for example "restricted", "access blocked", "app review", "data use checkup", "verification required").
4. Left menu: App settings > Basic. Tell me the "App mode" (Development or Live) and whether the app status says anything other than "Live".
5. Left menu: App roles > Roles. Confirm your Instagram account is listed as an Administrator or a Developer/Tester (or an Instagram Tester).
6. Open https://business.facebook.com/settings > Security Center (or Business info). Tell me whether it says the business is restricted or needs verification.
7. In the Instagram app: Settings and activity > Account Status. Tell me whether it shows any restriction.
8. In the Instagram app: Settings and activity > Website permissions > Apps and websites (it may appear as "Apps and websites"). Tell me whether the TCC automation app is still listed as active.

## Trial Reel research (documentation only; production unchanged)

Checked 2026-10-05 against Meta's official docs (Content Publishing guide and the IG User Media reference):

- A. Create a Trial Reel: documented. Add `trial_params={"graduation_strategy":"MANUAL"}` (or `SS_PERFORMANCE`) to a `media_type=REELS` container. `MANUAL` is what you would want so Instagram does not auto-graduate on its own threshold.
- B. Trial view metrics: unverified. The Reels insights `views` metric is documented, but the docs say nothing about Trial Reels. Needs a live test once access returns.
- C. Programmatic "share with everyone": not supported. `MANUAL` means graduation happens in the Instagram app. The IG Media node accepts only a `comment_enabled` update, and no graduate endpoint is documented.

Trial-Reel-first production is NOT approved or active. If Meta later documents a graduation endpoint, record it here and verify it with a real test before using it.
