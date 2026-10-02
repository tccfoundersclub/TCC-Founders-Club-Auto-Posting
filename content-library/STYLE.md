# TCC Reel Style (2026-10-02)

The production renderer's visual style - fonts, sizes, weights, colors, coordinates - now comes from one versioned config file instead of being hardcoded across scripts, sourced from the private TCC Reel Style Studio (`https://tcc-reel-style-studio.athar-official07.chatgpt.site/`).

## Where everything lives

| What | Where |
|---|---|
| Raw captured export | `content-library/styles/exports/TCC-Reel-Template.json` |
| Validated, versioned config the renderer actually reads | `content-library/styles/tcc-reel-style.v1.json` |
| Config loader + validator | `src/styleConfig.js` |
| Renderer that consumes it | `buildTccReelStyleTemplate()` in `src/media.js` |
| Bundled font files | `assets/fonts/{inter,cormorant-garamond,manrope}/*.ttf` (committed - `.gitignore` has a `!assets/fonts/**/*.ttf` exception to the general `*.ttf` rule) |
| Content mapping into the template | `renderConcept()` in `src/reelPipeline.js` |
| Manual preview-render script (never touches state/publish) | `scripts/render-style-previews.js` |

## How the export was obtained

The studio's "Download template JSON" button triggers a client-side blob download, not an HTTP endpoint - it was captured by opening the studio in-browser, patching `URL.createObjectURL` to intercept the blob, and clicking the button. The exported JSON only carries the *currently selected* treatment (Inter/Inter, white-panel, the locked default); the two alternate font pairings and two alternate caption treatments are documented in the studio's UI copy but not in that particular JSON, so `tcc-reel-style.v1.json` normalizes all of that into one file by hand-transcribing the studio's own "Style lab" and "Production sheet" text.

## Importing a newer export later

1. Open the studio, select the treatment you want as the new default, click "Download template JSON" and save it as `content-library/styles/exports/TCC-Reel-Template.json` (replacing the old one - the old one is preserved in git history).
2. Update `content-library/styles/tcc-reel-style.v1.json` by hand: bump `"version"` if the structure changes meaningfully, update the relevant `roles`/`colors`/`fontPairings`/`treatments` entries from the new export's `style`/`layers`/`palette` fields.
3. If a role's size moved outside its documented `range`, either widen the range (if the studio's own "Role / Range" table changed) or treat it as a bug in the export - `src/styleConfig.js`'s `loadStyleConfig()` throws immediately if any role is outside its range, so this is caught at the first render attempt, not silently.
4. If a new font or weight is introduced, add the actual licensed static-weight `.ttf` file under `assets/fonts/` (same pattern as the existing three families - do not point at a system font or a variable font no code here instantiates) and add its entry to `fontFiles` in the config.
5. Run `node --env-file=.env scripts/render-style-previews.js` to render fresh previews before trusting it in production - it uses real content-bank concepts and never touches remote state.

## Content mapping (existing concept fields -> template roles)

The content bank's concepts (`topic`/`hook`/`context`/`points[]`/`caption`/`cta`) predate this style system and keep their existing shape - nothing about the content bank, duplicate detection, or caption/hashtag pipeline changed. The mapping into the new template, in `renderConcept()`:

- **Hook** <- `concept.hook` (unchanged field)
- **Insight** <- `concept.context` (already written as a single punchy line - a good match for the style guide's "one concise idea" role). The richer `points[]` detail is *not* shown on screen anymore; it still lives in full in the Instagram caption via `concept.caption`, which is untouched.
- **CTA** (on-screen button) <- always `"READ CAPTION"`, since the caption carries the actual next step (DM prompt, etc.) - matches the style guide's own rule for when to use that button.
- **Subtitle role** - not used. These reels have no spoken audio (text-over-B-roll with a music bed, not narration), and the style guide is explicit that subtitles must never be invented when there's nothing spoken to transcribe.
- **Brand** <- a fixed `"TCC FOUNDERS CLUB"` mark, shown for the full 10s at low emphasis (the style guide documents its position but not its timing - showing it throughout was the least presumptive reading of "secondary branding only").

## Timing

10-second format (unchanged, exact requirement preserved): hook 0-2s, insight 2-8s, CTA 8-10s - directly from the style guide's own "example timing for a 10-second reel," no scaling needed.

## A real content/style mismatch, found and handled (not silently papered over)

The 306 existing content-bank hooks were written for the *old* template (52px font, no line cap, shown as a static info card) and are often 10-14 word full sentences - well past the new style's "4-8 words, 3 lines" guidance at 86px. Rendering several real concepts during validation confirmed most hook text does not fit in 3 lines even at the role's documented size floor (72px).

**What the renderer does about it:** `fitTextToRole()` in `buildTccReelStyleTemplate()` first tries the role's default size; if the text wraps past `maxLines`, it shrinks in 2px steps down to the role's documented range minimum (e.g. 72px for hook) and re-wraps at each step. If it *still* overflows at the range floor, it renders the extra lines anyway rather than ever dropping words - the panel simply grows taller. Because hook/insight/CTA are shown in sequential, non-overlapping time windows (not simultaneously, unlike the old template), a taller hook panel never visually collides with the insight or CTA text - confirmed by rendering and inspecting actual frames (see Validation below), not just by code review.

Every shrink or overflow is logged (`console.warn`) so it's visible in a GitHub Actions run, not silent. This was deliberately not "fixed" by rewriting the 306 existing concepts' hooks - that's a content decision, not a renderer bug, and was out of scope for this change. If tighter hook adherence to the 4-8 word guidance matters going forward, it's a `scripts/add-to-content-bank.js` batch-writing convention to apply to *new* concepts, not a retroactive rewrite.

## Validation performed

Render-only - nothing in this process uploads to Supabase, writes to `state.reels`/`state.contentBank`, or calls any publish function. Run via `node --env-file=.env scripts/render-style-previews.js`:

1. **Default treatment** (Inter/Inter, white panels) rendered against a real content-bank concept.
2. **Alternate pairing** (Cormorant Garamond / Manrope) rendered against a second real concept.
3. **Long-copy stress test** - a deliberately extreme hook (22 words) and insight (a long run-on sentence), to observe wrapping/shrink behavior directly rather than assume it.
4. **Deliberate failure test** - an unknown font-pairing key, confirming `resolveFontFile()` throws a clear error naming the valid options, and that nothing is silently substituted.

All four MP4s were checked with `ffprobe` (1080x1920, h264, 30fps, 10.000s container duration - matches the pipeline's exact-10-second requirement) and visually inspected by extracting frames from each timing window (hook/insight/CTA). Confirmed: no clipped or truncated text anywhere, correct fonts loaded (serif renders as serif, sans as sans - not substituted), correct colors/contrast, text centered within the 150-930px content boundary, no visible collision between sequential beats even in the long-copy overflow case.

**Limitation found and fixed during validation, not before:** the first render attempt failed on every case with a corrupted ffmpeg filtergraph, traced to `path.join()` on Windows producing backslash-separated font paths that ffmpeg's filter parser misinterprets as escape sequences (the existing, older template code already normalizes this; the new code initially didn't). Fixed in `buildTccReelStyleTemplate()` before any preview was trusted.

**Known limitation, not fixed:** `fitTextToRole()`'s character-width estimate (`boundaryWidth / (fontSize * factor)`) is a heuristic, the same kind the older template already used - not a true font-metrics measurement. It was accurate enough across every real concept tested, but an unusually wide character set (e.g. a hook that's almost entirely capital M/W) could still estimate a line or two off. This is a pre-existing class of approximation in this codebase, not something newly introduced.

## Is the live renderer using this now?

Yes. `renderConcept()` in `src/reelPipeline.js` calls `buildTccReelStyleTemplate` (via `compileMultiClipReel`'s new `styleTemplate`/`styleConfig` params) as of this change - every reel the live pipeline renders from now on uses this style, at the config's default pairing (`inter-inter`) and treatment (`white-panel`). The older `buildYellowTemplateFilters` path (hook/context/points simultaneous info-card) is untouched and still fully functional in `src/media.js` and `compileMultiClipReel` (via the original `template`/`templateFonts`/`templateOpts` params) - nothing deletes it - so rolling back is a one-line change in `renderConcept()` if ever needed.
