import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const VIDEO_EXTS = new Set([".mp4", ".mov", ".m4v", ".avi", ".mkv"]);

// On the GitHub Actions runner, `ffmpeg` is on PATH after `apt-get install`.
// On this Windows dev machine, the winget-installed ffmpeg is a symlink that
// Windows' own CreateProcess can't resolve via PATH, so local testing needs
// an explicit FFMPEG_PATH pointing at the real .exe.
function ffmpegBinary() {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

export function isVideo(fileName) {
  return VIDEO_EXTS.has(path.extname(fileName).toLowerCase());
}

// Normalizes an image to the same 4:5 canvas, re-encoded as JPEG.
export function compileImage(inputPath, outputPath) {
  execFileSync(ffmpegBinary(), [
    "-y",
    "-i", inputPath,
    "-vf", "scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350",
    outputPath,
  ], { stdio: "inherit" });
  return outputPath;
}

function defaultFontPath() {
  // Ubuntu (GitHub Actions runner, after `apt-get install fonts-dejavu-core`)
  if (process.platform === "linux") {
    return "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
  }
  // Windows, for local testing
  return "C:/Windows/Fonts/arialbd.ttf";
}

function escapeDrawtext(text) {
  return text.replace(/\\/g, "\\\\\\\\").replace(/:/g, "\\:").replace(/'/g, "\u2019");
}

// Builds a "Silent Film Storytelling Reel" (the format behind some of the
// best-performing creator content: no talking, just music + B-roll + on-screen
// text carrying the narrative). Takes a sequence of short text beats, each
// shown for its own time window, so the on-screen copy tells a mini story arc
// (hook -> tension -> insight -> CTA) over the clip instead of one static line.
// musicPath is optional - if omitted, the clip's original audio is kept as-is.
export function compileReel({ inputPath, outputPath, beats = [], musicPath, fontPath }) {
  const safeFontPath = (fontPath || defaultFontPath()).replace(/:/g, "\\:");

  const beatFilters = beats
    .map(({ text, start, end }) => {
      const safeText = escapeDrawtext(text);
      return `,drawtext=fontfile='${safeFontPath}':text='${safeText}':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=140:line_spacing=10:box=1:boxcolor=black@0.45:boxborderw=24:expansion=none:enable='between(t\\,${start}\\,${end})'`;
    })
    .join("");

  const args = ["-y", "-i", inputPath];
  if (musicPath) args.push("-i", musicPath);

  const videoChain = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920${beatFilters}[vout]`;

  let filterComplex;
  let maps;
  if (musicPath) {
    filterComplex =
      `${videoChain};` +
      `[0:a]volume=1.0[a0];` +
      `[1:a]volume=0.30[a1];` +
      `[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]`;
    maps = ["-map", "[vout]", "-map", "[aout]"];
  } else {
    filterComplex = videoChain;
    maps = ["-map", "[vout]", "-map", "0:a?"];
  }

  args.push(
    "-filter_complex", filterComplex,
    ...maps,
    "-t", "58",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath
  );

  execFileSync(ffmpegBinary(), args, { stdio: "inherit" });
  return outputPath;
}

// Cuts a short (typically 10s) clip out of a longer source video starting at
// startTime, overlays a couple of timed text beats (hook + CTA), and keeps
// the source clip's own audio untouched (e.g. a nasheed/soundtrack that's
// already baked into the footage) - no separate music track needed.
// Hook / body / CTA get their own size and color, but all three share one
// heavy black outline (no background box) so the text pops directly against
// whatever's in the footage behind it - the "TikTok caption" look, not a
// captioned-over-a-dark-bar look.
const CLIP_BEAT_STYLES = [
  { fontsize: 66, fontcolor: "white" }, // hook
  { fontsize: 52, fontcolor: "white" }, // body
  { fontsize: 56, fontcolor: "0xd4af37" }, // cta (brand gold)
];

function buildBeatFilters(beats, fontPath) {
  const safeFontPath = (fontPath || defaultFontPath()).replace(/:/g, "\\:");
  return beats
    .map(({ text, start, end }, i) => {
      const safeText = escapeDrawtext(text);
      const style = CLIP_BEAT_STYLES[i] || CLIP_BEAT_STYLES[CLIP_BEAT_STYLES.length - 1];
      return (
        `,drawtext=fontfile='${safeFontPath}':text='${safeText}':` +
        `fontsize=${style.fontsize}:fontcolor=${style.fontcolor}:` +
        `bordercolor=black:borderw=6:` +
        `x=(w-text_w)/2:y=h*0.30-text_h/2:line_spacing=14:box=0:expansion=none:` +
        `enable='between(t\\,${start}\\,${end})'`
      );
    })
    .join("");
}

// Luxury-editorial text system: small tracked-out category tag, a large
// serif hook, a smaller sans caption line, and a gold sans CTA beat at the
// end - left-aligned inside a 150px/250px safe zone, sitting on a soft
// gradient scrim (not per-line boxes) so it reads like a designed frame
// rather than a caption card. See CONTENT_PLAN.md for the full type system.
const SAFE_X = 150;
const SAFE_TOP = 250;
const SAFE_BOTTOM = 250;
const CANVAS_W = 1080;
const CANVAS_H = 1920;

function trackedUpper(text) {
  return text.toUpperCase().split("").join(" "); // thin-space letter tracking
}

// Empirical line-height multiplier: drawtext's line_spacing is *added* to
// whatever the font's own ascent+descent is, and serif fonts (Cormorant)
// run tall - measuring a fixed px addition consistently underestimated
// real rendered height and caused later blocks to overlap. Sizing off the
// fontsize itself is far more reliable across fonts/sizes.
const LINE_HEIGHT_FACTOR = 1.35;

function buildEditorialFilters({ tag, hook, caption, cta }, totalDuration, fonts) {
  const cormorantBold = (fonts.hook || fonts.serif).replace(/:/g, "\\:");
  const manropeSemibold = (fonts.tag || fonts.sansSemibold).replace(/:/g, "\\:");
  const manropeRegular = (fonts.caption || fonts.sansRegular).replace(/:/g, "\\:");
  const manropeCta = (fonts.cta || fonts.sansSemibold).replace(/:/g, "\\:");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tcc-editorial-"));
  const writeText = (name, content) => {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, content, "utf8");
    return p.replace(/\\/g, "/").replace(/:/g, "\\:");
  };

  const TAG_SIZE = 34;
  const HOOK_SIZE = 76;
  const CAPTION_SIZE = 42;
  const CTA_SIZE = 46;

  const tagFile = writeText("tag.txt", trackedUpper(tag));
  const hookWrapped = wrapText(hook, 17);
  const hookFile = writeText("hook.txt", hookWrapped);
  const captionWrapped = wrapText(caption, 34);
  const captionFile = writeText("caption.txt", captionWrapped);
  const ctaWrapped = wrapText(cta, 34);
  const ctaFile = writeText("cta.txt", ctaWrapped);

  // Hook and caption are SEPARATE sequential beats (not stacked together) -
  // each gets the full safe-zone content area to itself, vertically
  // centered, so a long hook can never collide with the caption below it.
  const tagY = SAFE_TOP;
  const contentTop = tagY + TAG_SIZE + 50;
  const contentBottom = CANVAS_H - SAFE_BOTTOM - 260; // leave the CTA's own zone clear

  const hookLines = hookWrapped.split("\n").length;
  const hookBlockHeight = hookLines * HOOK_SIZE * LINE_HEIGHT_FACTOR;
  const hookY = contentTop + Math.max(0, (contentBottom - contentTop - hookBlockHeight) / 2);

  const captionLines = captionWrapped.split("\n").length;
  const captionBlockHeight = captionLines * CAPTION_SIZE * LINE_HEIGHT_FACTOR;
  const captionY = contentTop + Math.max(0, (contentBottom - contentTop - captionBlockHeight) / 2);

  const ctaLines = ctaWrapped.split("\n").length;
  const ctaBlockHeight = ctaLines * CTA_SIZE * LINE_HEIGHT_FACTOR;
  const ctaY = CANVAS_H - SAFE_BOTTOM - ctaBlockHeight;

  // Timing: hook gets ~38% of the clip, CTA holds the last ~24%, caption
  // fills the middle - all with a small gap between beats.
  const gap = 0.15;
  const hookEnd = Math.max(2.2, totalDuration * 0.38);
  const ctaLead = Math.min(3.2, totalDuration * 0.26);
  const ctaStart = Math.max(hookEnd + 1.5, totalDuration - ctaLead);
  const captionStart = hookEnd + gap;
  const captionEnd = ctaStart - gap;
  const tagEnd = ctaStart; // tag persists through the hook + caption beats

  const hookScrim =
    `,drawbox=x=0:y=0:w=${CANVAS_W}:h=${Math.round(hookY + hookBlockHeight + 50)}:color=black@0.38:t=fill:` +
    `enable='between(t\\,0\\,${hookEnd})'`;
  const captionScrim =
    `,drawbox=x=0:y=0:w=${CANVAS_W}:h=${Math.round(captionY + captionBlockHeight + 50)}:color=black@0.38:t=fill:` +
    `enable='between(t\\,${captionStart}\\,${captionEnd})'`;

  const tagFilter =
    `,drawtext=fontfile='${manropeSemibold}':textfile='${tagFile}':` +
    `fontsize=${TAG_SIZE}:fontcolor=0xd4af37:x=${SAFE_X}:y=${tagY}:expansion=none:` +
    `enable='between(t\\,0\\,${tagEnd})'`;

  const hookFilter =
    `,drawtext=fontfile='${cormorantBold}':textfile='${hookFile}':` +
    `fontsize=${HOOK_SIZE}:fontcolor=white:x=${SAFE_X}:y=${Math.round(hookY)}:line_spacing=16:expansion=none:` +
    `enable='between(t\\,0\\,${hookEnd})'`;

  const captionFilter =
    `,drawtext=fontfile='${manropeRegular}':textfile='${captionFile}':` +
    `fontsize=${CAPTION_SIZE}:fontcolor=white:x=${SAFE_X}:y=${Math.round(captionY)}:line_spacing=12:expansion=none:` +
    `enable='between(t\\,${captionStart}\\,${captionEnd})'`;

  const bottomScrim =
    `,drawbox=x=0:y=${Math.round(ctaY - 40)}:w=${CANVAS_W}:h=${Math.round(ctaBlockHeight + 80)}:color=black@0.42:t=fill:` +
    `enable='between(t\\,${ctaStart}\\,${totalDuration})'`;
  const ctaFilter =
    `,drawtext=fontfile='${manropeCta}':textfile='${ctaFile}':` +
    `fontsize=${CTA_SIZE}:fontcolor=0xd4af37:x=${SAFE_X}:y=${Math.round(ctaY)}:line_spacing=14:expansion=none:` +
    `enable='between(t\\,${ctaStart}\\,${totalDuration})'`;

  return hookScrim + captionScrim + tagFilter + hookFilter + captionFilter + bottomScrim + ctaFilter;
}

// LOCKED TCC template (see CONTENT_PLAN.md): highlighted hook box (bold
// text) + white context line + white numbered points + highlighted "READ
// CAPTION" button, all shown simultaneously for the whole clip over a
// continuously-moving dark background video. Layout follows the fixed
// percentage zones from the spec - do not restructure without updating
// the written spec first.
//
// Two separate brand identities share this template - never mix them:
//   The Connector Club -> yellow accent panels, black text
//   TCC Founders Club  -> white accent panels, black text
// The caller picks one via the `brand` option; "founders" is the default
// since that's the account this pipeline currently posts to.
const BRANDS = {
  connector: { accentBackground: "0xFFD100", accentForeground: "black" },
  founders: { accentBackground: "white", accentForeground: "black" },
};

// ffmpeg's drawbox can only draw sharp-cornered rectangles, so a rounded
// panel has to be pre-rendered as its own RGBA PNG (solid fill, alpha
// mask carved out at the corners via a signed-distance-to-rounded-rect
// formula) and composited onto the video with `overlay`, rather than drawn
// inline with drawbox.
function resolveRgb(colorName) {
  const named = { white: [255, 255, 255], black: [0, 0, 0] };
  if (named[colorName]) return named[colorName];
  const hex = colorName.replace(/^0x/, "").replace(/^#/, "");
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function generateRoundedRectPNG(width, height, radius, colorName, outPath) {
  const [r, g, b] = resolveRgb(colorName);
  const alphaExpr = `if(gt(hypot(X-min(max(X\\,${radius})\\,W-1-${radius})\\,Y-min(max(Y\\,${radius})\\,H-1-${radius}))\\,${radius})\\,0\\,255)`;
  const args = [
    "-y",
    "-f", "lavfi", "-i", `color=c=black:s=${width}x${height}`,
    "-vf", `format=rgba,geq=r='${r}':g='${g}':b='${b}':a='${alphaExpr}'`,
    "-frames:v", "1",
    "-update", "1",
    outPath,
  ];
  execFileSync(ffmpegBinary(), args, { stdio: "inherit" });
  return outPath;
}

// ffmpeg's drawtext does NOT center multi-line text per-line: a single
// drawtext call with embedded \n centers the BLOCK (by its widest line) but
// left-justifies every line within that block. That mismatch is what read
// as "inconsistent alignment" - the fix is to render each line as its own
// drawtext call, each independently centered with x=(w-text_w)/2.
function wrapToWidth(text, maxChars) {
  return wrapText(text, maxChars).split("\n");
}

// Greedy-wraps at maxChars, then shrinks the target width as far as
// possible without increasing the line count - this is what keeps a block
// from producing one very long line followed by a short orphan.
function balancedWrap(text, maxChars) {
  const greedyLines = wrapToWidth(text, maxChars);
  if (greedyLines.length <= 1) return greedyLines;
  const minTarget = Math.ceil(text.length / greedyLines.length) + 2;
  let best = greedyLines;
  for (let target = maxChars - 1; target >= minTarget; target--) {
    const candidate = wrapToWidth(text, target);
    if (candidate.length === greedyLines.length) {
      best = candidate;
    } else {
      break;
    }
  }
  return best;
}

function buildYellowTemplateFilters({ hook, context, points, buttonText = "READ CAPTION" }, totalDuration, fonts, opts = {}) {
  const bold = (fonts.bold || fonts.arialBold).replace(/:/g, "\\:");
  const regular = (fonts.regular || fonts.arialRegular).replace(/:/g, "\\:");
  const overlayOpacity = opts.overlayOpacity ?? 0.7;
  const grayscale = opts.grayscale ? "hue=s=0," : "";
  const brand = BRANDS[opts.brand || "founders"];

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tcc-template-"));
  let fileCounter = 0;
  const writeText = (content) => {
    const p = path.join(tmpDir, `t${fileCounter++}.txt`);
    fs.writeFileSync(p, content, "utf8");
    return p.replace(/\\/g, "/").replace(/:/g, "\\:");
  };

  // One shared content column everything aligns to - hook, intro, points
  // and the button all wrap to the same pixel width and sit on the same
  // centered axis, instead of each block picking its own arbitrary width.
  const CONTENT_WIDTH = 840;

  const HOOK_SIZE = 52;
  const CONTEXT_SIZE = 32; // +~15% over the previous 28px body size
  const POINT_SIZE = 32;
  const BUTTON_SIZE = 36;

  const charsFor = (fontSize, isBold) => Math.floor(CONTENT_WIDTH / (fontSize * (isBold ? 0.58 : 0.52)));

  const lineHeight = (fontSize, spacing) => fontSize * 1.22 + spacing;
  const HOOK_LH = lineHeight(HOOK_SIZE, 8);
  const CONTEXT_LH = lineHeight(CONTEXT_SIZE, 6);
  const POINT_LH = lineHeight(POINT_SIZE, 6);

  // Spacing system (spec ranges): hook->intro 40, intro->point1 40,
  // between points 33, last point->CTA 52.
  const GAP_HOOK_INTRO = 40;
  const GAP_INTRO_POINTS = 40;
  const GAP_BETWEEN_POINTS = 33;
  const GAP_POINTS_CTA = 52;

  // Auto copy-fit: drop trailing points (never shrink type) until the
  // content actually fits above the button's lowest reasonable position.
  const maxContentBottom = CANVAS_H * 0.86;
  let activePoints = points;
  let hookLines, contextLines, pointLineSets, layout;

  for (;;) {
    hookLines = balancedWrap(hook, charsFor(HOOK_SIZE, true));
    contextLines = balancedWrap(context, charsFor(CONTEXT_SIZE, false));
    pointLineSets = activePoints.map((p, i) => balancedWrap(`${i + 1}. ${p}`, charsFor(POINT_SIZE, false)));

    const hookBoxTop = Math.round(CANVAS_H * 0.14);
    const boxPadV = 30;
    const boxWidth = CONTENT_WIDTH;
    const boxX = Math.round((CANVAS_W - boxWidth) / 2);
    const hookTextHeight = hookLines.length * HOOK_LH;
    const boxHeight = Math.round(hookTextHeight + boxPadV * 2);
    const hookTextTop = hookBoxTop + boxPadV;

    const contextTop = hookBoxTop + boxHeight + GAP_HOOK_INTRO;
    const contextHeight = contextLines.length * CONTEXT_LH;

    let cursor = contextTop + contextHeight + GAP_INTRO_POINTS;
    const pointsLayout = pointLineSets.map((lines, i) => {
      const top = cursor;
      cursor += lines.length * POINT_LH + (i < pointLineSets.length - 1 ? GAP_BETWEEN_POINTS : 0);
      return { lines, top };
    });

    const buttonTop = Math.max(cursor + GAP_POINTS_CTA, Math.round(CANVAS_H * 0.80));
    const buttonTextHeight = lineHeight(BUTTON_SIZE, 0);
    const buttonPadV = 22;
    const buttonHeight = Math.round(buttonTextHeight + buttonPadV * 2);

    layout = { hookBoxTop, boxPadV, boxWidth, boxX, boxHeight, hookTextTop, contextTop, pointsLayout, buttonTop, buttonPadV, buttonHeight };

    if (buttonTop + buttonHeight <= maxContentBottom || activePoints.length <= 3) break;
    activePoints = activePoints.slice(0, -1); // drop the last point and retry
  }

  const { hookBoxTop, boxWidth, boxX, boxHeight, hookTextTop, contextTop, pointsLayout, buttonTop, buttonPadV, buttonHeight } = layout;
  const buttonWidth = 420;
  const buttonX = Math.round((CANVAS_W - buttonWidth) / 2);

  const enable = `enable='between(t\\,0\\,${totalDuration})'`;
  const darkOverlay = `,drawbox=x=0:y=0:w=${CANVAS_W}:h=${CANVAS_H}:color=black@${overlayOpacity}:t=fill:${enable}`;

  // Rounded panels: "premium modern rectangular card", not sharp and not a
  // pill (16px hook, 14px button) - pre-rendered as RGBA PNGs since drawbox
  // can only draw sharp corners.
  const hookPanelPath = generateRoundedRectPNG(boxWidth, boxHeight, 16, brand.accentBackground, path.join(tmpDir, "hookpanel.png"));
  const buttonPanelPath = generateRoundedRectPNG(buttonWidth, buttonHeight, 14, brand.accentBackground, path.join(tmpDir, "buttonpanel.png"));

  const centeredLines = (lines, fontfile, fontsize, color, top, lh) =>
    lines
      .map((line, i) => {
        const file = writeText(line);
        return (
          `,drawtext=fontfile='${fontfile}':textfile='${file}':` +
          `fontsize=${fontsize}:fontcolor=${color}:x=(w-text_w)/2:y=${Math.round(top + i * lh)}:` +
          `expansion=none:${enable}`
        );
      })
      .join("");

  const hookTextFilter = centeredLines(hookLines, bold, HOOK_SIZE, brand.accentForeground, hookTextTop, HOOK_LH);
  const contextFilter = centeredLines(contextLines, regular, CONTEXT_SIZE, "white", contextTop, CONTEXT_LH);
  const pointsFilter = pointsLayout
    .map(({ lines, top }) => centeredLines(lines, regular, POINT_SIZE, "white", top, POINT_LH))
    .join("");
  const buttonTextFilter = centeredLines([buttonText.toUpperCase()], bold, BUTTON_SIZE, brand.accentForeground, buttonTop + buttonPadV, 0);

  return {
    grayscale,
    darkOverlay,
    panels: [
      { path: hookPanelPath, x: boxX, y: hookBoxTop },
      { path: buttonPanelPath, x: buttonX, y: buttonTop },
    ],
    textFilters: hookTextFilter + contextFilter + pointsFilter + buttonTextFilter,
    enable,
  };
}

export function compileClipReel({ inputPath, outputPath, startTime, duration, beats = [], fontPath }) {
  const beatFilters = buildBeatFilters(beats, fontPath);

  const videoChain = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920${beatFilters}[vout]`;

  const args = [
    "-y",
    "-ss", `${startTime}`,
    "-i", inputPath,
    "-t", `${duration}`,
    "-filter_complex", videoChain,
    "-map", "[vout]",
    "-map", "0:a?",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath,
  ];

  execFileSync(ffmpegBinary(), args, { stdio: "inherit" });
  return outputPath;
}

// Cuts several short segments out of the same source video and blends them
// together with a crossfade into one continuous-feeling edit ("a complete
// package video" instead of one static clip), overlays the hook/body/CTA
// beats across the combined timeline, and lays a licensed music track under
// the whole thing (the disjoint original-audio segments would just sound
// like jump cuts glued together, so music replaces it entirely here).
export function compileMultiClipReel({
  inputPath,
  outputPath,
  segments, // [{ start, duration }, ...] - source timestamps to cut
  beats = [],
  editorial, // { tag, hook, caption, cta } - luxury-editorial text system (see buildEditorialFilters)
  fonts, // { hook, tag, caption, cta } font paths for the editorial system
  template, // { hook, context, points, buttonText } - locked yellow-box template (see buildYellowTemplateFilters)
  templateFonts, // { bold, regular } font paths for the template system
  templateOpts, // { overlayOpacity, grayscale } - Mode A (color) vs Mode B (black & white)
  musicPath,
  musicStart = 0, // seconds into the track to start the excerpt from
  fontPath,
  xfadeDuration = 0.4,
  targetDuration, // force an exact final duration (e.g. 10.0), overriding the crossfade-computed total
}) {
  const n = segments.length;

  const inputArgs = segments.flatMap((s) => [
    "-ss", `${s.start}`, "-i", inputPath, "-t", `${s.duration}`,
  ]);

  const grayscale = template && templateOpts?.grayscale ? "hue=s=0," : "";
  const scaleFilters = segments
    .map((_, i) => `[${i}:v]${grayscale}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[v${i}]`)
    .join(";");

  let xfadeChain = "";
  let runningDuration = segments[0].duration;
  let prevLabel = "v0";
  for (let i = 1; i < n; i++) {
    const offset = runningDuration - xfadeDuration;
    const outLabel = `vx${i}`;
    xfadeChain += `;[${prevLabel}][v${i}]xfade=transition=fade:duration=${xfadeDuration}:offset=${offset}[${outLabel}]`;
    runningDuration = runningDuration + segments[i].duration - xfadeDuration;
    prevLabel = outLabel;
  }
  // targetDuration lets a caller force an exact final length (e.g. "must be
  // 10.000s") regardless of the crossfade math above - segments should be
  // sized with a little slack so this only ever trims, never runs short.
  const totalDuration = targetDuration || runningDuration;

  const templateResult = template
    ? buildYellowTemplateFilters(template, totalDuration, templateFonts || {}, templateOpts || {})
    : null;

  const videoChain = n === 1 ? `${scaleFilters}` : `${scaleFilters}${xfadeChain}`;
  // `prevLabel` (declared above, in the xfade loop) is the label of the
  // fully blended video with no text yet - both the template's panel/text
  // system and the older beat/editorial text systems chain off of it.

  let fullVideoFilter;
  let panelInputArgs = [];
  if (templateResult) {
    panelInputArgs = templateResult.panels.flatMap((p) => ["-i", p.path]);
    const panelInputBase = n; // panels are the inputs right after the video segments
    let label = prevLabel;
    let chain = `;[${label}]${templateResult.darkOverlay.slice(1)}[vdark]`;
    label = "vdark";
    templateResult.panels.forEach((p, i) => {
      const outLabel = `vp${i}`;
      chain += `;[${label}][${panelInputBase + i}:v]overlay=x=${p.x}:y=${p.y}:${templateResult.enable}[${outLabel}]`;
      label = outLabel;
    });
    chain += `;[${label}]${templateResult.textFilters.slice(1)}[vout]`;
    fullVideoFilter = videoChain + chain;
  } else {
    const textFilters = editorial
      ? buildEditorialFilters(editorial, totalDuration, fonts || {})
      : buildBeatFilters(beats, fontPath);
    fullVideoFilter = `${videoChain};[${prevLabel}]${textFilters.slice(1)}[vout]`;
  }
  const musicIndex = n + panelInputArgs.length / 2; // music is the input right after video segments + any panel images
  let fullFilter = fullVideoFilter;
  if (musicPath) {
    // Short in/out fades so a mid-track excerpt never starts or ends on an
    // audible click - "clean beginning ... reasonable ending" per spec.
    const fadeOutStart = Math.max(0, totalDuration - 0.3);
    fullFilter += `;[${musicIndex}:a]afade=t=in:st=0:d=0.3,afade=t=out:st=${fadeOutStart}:d=0.3[aout]`;
  }

  const musicInputArgs = musicPath
    ? [...(musicStart > 0 ? ["-ss", `${musicStart}`] : []), "-i", musicPath]
    : [];
  const args = [
    "-y",
    ...inputArgs,
    ...panelInputArgs,
    ...musicInputArgs,
    "-filter_complex", fullFilter,
    "-map", "[vout]",
  ];
  if (musicPath) {
    // No -shortest: it interacts badly with this xfade filtergraph and was
    // truncating output to an arbitrary early length. The explicit -t below
    // already bounds both streams correctly.
    args.push("-map", "[aout]");
  }
  args.push(
    "-t", `${totalDuration}`,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath
  );

  execFileSync(ffmpegBinary(), args, { stdio: "inherit" });
  return { outputPath, totalDuration };
}

function wrapText(text, maxChars) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines.join("\n");
}

function wordCount(text) {
  return text.trim().split(/\s+/).length;
}

// Splits a caption (as written in captions.js: hook paragraph, one or more
// body paragraphs, then the CTA sentence, separated by blank lines) into
// timed on-screen beats: hook first, then each paragraph in order, then the
// CTA held a little longer at the end. Duration per beat scales with word
// count so nobody has to speed-read a long paragraph.
export function captionToBeats(captionText) {
  const paragraphs = captionText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const hook = paragraphs[0];
  const cta = paragraphs[paragraphs.length - 1];
  const body = paragraphs.slice(1, -1);

  const WORDS_PER_SEC = 2.3;
  const readDuration = (text, min = 3.5) => Math.max(min, wordCount(text) / WORDS_PER_SEC);

  const specs = [
    { text: hook, style: "hook", duration: Math.max(4, readDuration(hook)) },
    ...body.map((text) => ({ text, style: "body", duration: readDuration(text) })),
    { text: cta, style: "cta", duration: readDuration(cta) + 2 },
  ];

  let t = 0;
  return specs.map(({ text, style, duration }) => {
    const beat = { text, style, start: t, end: t + duration };
    t += duration;
    return beat;
  });
}

const BEAT_STYLES = {
  hook: { fontsize: 62, fontcolor: "white", maxChars: 26 },
  body: { fontsize: 46, fontcolor: "white", maxChars: 34 },
  cta: { fontsize: 42, fontcolor: "0xd4af37", maxChars: 36 },
};

// Renders a full caption as a vertical (9:16) "text reel": dark background,
// no B-roll needed, the caption itself carries the video - hook first, then
// each paragraph, then the CTA held on screen at the end. Used when there's
// no raw footage to cut against yet.
export function compileCaptionReel({ outputPath, captionText, fontPath }) {
  const safeFontPath = (fontPath || defaultFontPath()).replace(/:/g, "\\:");
  const beats = captionToBeats(captionText);
  const totalDuration = beats[beats.length - 1].end;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tcc-reel-"));
  const beatFilters = beats
    .map((beat, i) => {
      const style = BEAT_STYLES[beat.style];
      const wrapped = wrapText(beat.text, style.maxChars);
      const textFile = path.join(tmpDir, `beat${i}.txt`);
      fs.writeFileSync(textFile, wrapped, "utf8");
      const safeTextFile = textFile.replace(/\\/g, "/").replace(/:/g, "\\:");
      return (
        `,drawtext=fontfile='${safeFontPath}':textfile='${safeTextFile}':` +
        `fontsize=${style.fontsize}:fontcolor=${style.fontcolor}:` +
        `x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=18:box=0:expansion=none:` +
        `enable='between(t\\,${beat.start}\\,${beat.end})'`
      );
    })
    .join("");

  const args = [
    "-y",
    "-f", "lavfi", "-i", `color=c=0x0a0a0a:s=1080x1920:d=${totalDuration}`,
    "-f", "lavfi", "-i", `anullsrc=r=44100:cl=stereo`,
    "-vf", beatFilters.slice(1),
    "-t", `${totalDuration}`,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-shortest",
    "-movflags", "+faststart",
    outputPath,
  ];

  execFileSync(ffmpegBinary(), args, { stdio: "inherit" });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return outputPath;
}
