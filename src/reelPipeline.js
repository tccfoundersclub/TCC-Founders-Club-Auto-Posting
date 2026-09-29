import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { compileMultiClipReel } from "./media.js";
import { uploadToSupabase } from "./supabase.js";
import { postToInstagram, postToFacebookPage, postToThreads } from "./social.js";
import { loadState, saveState, futureQueue, dueReels, lastScheduledTime, availableBankConcepts, assignConceptId } from "./remoteState.js";
import { FALLBACK_CONCEPTS } from "./fallbackConcepts.js";
import { BACKGROUND_VIDEO, MUSIC_LIBRARY } from "./mediaLibrary.js";
import { contentHash } from "./contentHistory.js";

// No live LLM calls in production - by design, per explicit instruction to
// avoid any paid API dependency. Replenishment draws only from the
// pre-written, zero-cost content bank (state.contentBank, filled offline via
// scripts/add-to-content-bank.js) and, if that's also empty, the small
// FALLBACK_CONCEPTS reserve. If both are exhausted, replenishment simply
// stops for that run and logs a warning - it never calls out to any API.
const TARGET_QUEUE = 20;
const REPLENISH_THRESHOLD = 16;
const HOURS_BETWEEN = 4;
const LOW_BANK_WARNING_THRESHOLD = 60;
const MAX_RENDERS_PER_RUN = 4; // bounds run time/minutes per GitHub Actions run
const HASHTAGS =
  "#TCCFoundersClub #TheConnectorClub #StartupPakistan #FoundersClub #Islamabad #Networking #FounderLife";

function templateFonts() {
  if (process.env.TEMPLATE_FONT_BOLD && process.env.TEMPLATE_FONT_REGULAR) {
    return { bold: process.env.TEMPLATE_FONT_BOLD, regular: process.env.TEMPLATE_FONT_REGULAR };
  }
  if (process.platform === "win32") {
    return { bold: "C:/Windows/Fonts/arialbd.ttf", regular: "C:/Windows/Fonts/arial.ttf" };
  }
  // Liberation Sans is a metric-compatible Arial clone, installed on the CI
  // runner via `apt-get install fonts-liberation` - keeps the locked
  // "Arial Bold only" template rule intact on Linux.
  return {
    bold: "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    regular: "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  };
}

async function downloadToTmp(url, filename) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download ${url}: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const tmpPath = path.join(os.tmpdir(), filename);
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

function probeDuration(filePath) {
  let output = "";
  try {
    execFileSync(process.env.FFMPEG_PATH || "ffmpeg", ["-i", filePath], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    output = (err.stderr ? err.stderr.toString() : "") + (err.stdout ? err.stdout.toString() : "");
  }
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!match) throw new Error("Could not determine rendered duration from ffmpeg output");
  const [, h, m, s] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function tokenSet(text) {
  return new Set(normalize(text).split(" ").filter(Boolean));
}

function jaccard(a, b) {
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

// Exact-hash duplicates are caught by contentHash comparison; this catches
// the "changed a few words, same substance" case the exact hash can't -
// high token overlap between hooks is a reasonable cheap proxy for "same
// message reworded" without a second LLM call per candidate.
function isSemanticDuplicate(concept, state) {
  const hookTokens = tokenSet(concept.hook);
  return state.reels.some((r) => jaccard(tokenSet(r.hook), hookTokens) >= 0.6);
}

function pickNextMusic(state) {
  const candidates = MUSIC_LIBRARY.filter((m) => m.path !== state.lastMusicPath);
  return candidates.length ? candidates[0] : MUSIC_LIBRARY[0];
}

function pickSegments(hook) {
  const dur = BACKGROUND_VIDEO.durationSeconds;
  const usableEnd = dur - 5;
  const seedBase = [...hook].reduce((a, c) => a + c.charCodeAt(0), 0);
  return [0.05, 0.35, 0.68].map((frac) => {
    const jitter = (seedBase * (frac * 100 + 1)) % 6;
    const start = Math.min(usableEnd - 4, Math.max(1, frac * usableEnd + jitter));
    return { start: Number(start.toFixed(2)), duration: 4 };
  });
}

function buildFullCaption(concept, musicCredit) {
  return `${concept.caption}\n\n${HASHTAGS}\n\n${musicCredit}`;
}

async function renderConcept(concept, state, log) {
  const music = pickNextMusic(state);
  const bgPath = await downloadToTmp(BACKGROUND_VIDEO.url, `bg-${Date.now()}.mp4`);
  const musicPath = await downloadToTmp(music.url, `music-${Date.now()}-${path.basename(music.path)}`);
  const outPath = path.join(os.tmpdir(), `reel-${Date.now()}.mp4`);

  try {
    const { totalDuration } = compileMultiClipReel({
      inputPath: bgPath,
      outputPath: outPath,
      segments: pickSegments(concept.hook),
      template: { hook: concept.hook, context: concept.context, points: concept.points, buttonText: "READ CAPTION" },
      templateFonts: templateFonts(),
      templateOpts: { overlayOpacity: 0.7, grayscale: false, brand: "founders" },
      musicPath,
      musicStart: 15,
      xfadeDuration: 0.4,
      targetDuration: 10,
    });

    const measured = probeDuration(outPath);
    log(`Rendered "${concept.hook}" - compiled=${totalDuration}s measured=${measured.toFixed(3)}s`);
    if (Math.abs(measured - 10) > 0.08) {
      throw new Error(`Rendered duration ${measured.toFixed(3)}s is not 10.000s - refusing to queue`);
    }

    const mediaUrl = await uploadToSupabase(outPath, `reels/reel-${Date.now()}.mp4`, "video/mp4");
    return { mediaUrl, music };
  } finally {
    for (const p of [bgPath, musicPath, outPath]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
}

function nextBankConcept(state) {
  // Bank first (the large pre-written batch), fallback bank second (small
  // reserve) - both zero-cost, no network call. Returns null when both are
  // exhausted, which the caller treats as "nothing left to replenish with".
  const bankConcept = state.contentBank.find((c) => c.status === "AVAILABLE");
  if (bankConcept) return { concept: bankConcept, source: "bank" };

  const usedFallbackHooks = new Set(state.reels.filter((r) => r.source === "fallback").map((r) => r.hook));
  const fallback = FALLBACK_CONCEPTS.find((c) => !usedFallbackHooks.has(c.hook));
  if (fallback) return { concept: fallback, source: "fallback" };

  return null;
}

async function replenish(state, log) {
  let rendersThisRun = 0;

  while (futureQueue(state).length < TARGET_QUEUE && rendersThisRun < MAX_RENDERS_PER_RUN) {
    const next = nextBankConcept(state);
    if (!next) {
      const available = availableBankConcepts(state).length;
      log(`Content bank and fallback reserve both exhausted (0 available). Queue at ${futureQueue(state).length}/${TARGET_QUEUE}. LOW_CONTENT_BANK: generate more concepts via scripts/add-to-content-bank.js.`);
      state.lowContentBankWarning = true;
      break;
    }
    const { concept, source } = next;

    const hash = contentHash(concept);
    if (state.reels.some((r) => r.contentHash === hash) || isSemanticDuplicate(concept, state)) {
      log(`Skipping duplicate concept from ${source}: ${concept.hook}`);
      if (source === "bank") concept.status = "REJECTED";
      continue;
    }

    let rendered;
    try {
      rendered = await renderConcept(concept, state, log);
      rendersThisRun++;
    } catch (err) {
      log(`Render failed for "${concept.hook}": ${err.message}`);
      if (source === "bank") concept.status = "REJECTED";
      continue;
    }

    const slot = new Date(lastScheduledTime(state).getTime() + HOURS_BETWEEN * 3600 * 1000);
    // Bank concepts already carry a permanent conceptId/batchId from
    // scripts/add-to-content-bank.js - the reel inherits it (same concept,
    // later lifecycle stage). Fallback concepts have no ID of their own
    // (src/fallbackConcepts.js is a static file), so one is minted here.
    const conceptId = source === "bank" ? concept.conceptId : assignConceptId(state);
    const batchId = source === "bank" ? concept.batchId : "FALLBACK";
    const nowIso = new Date().toISOString();
    const reel = {
      reelId: `reel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conceptId,
      batchId,
      topic: concept.topic,
      hook: concept.hook,
      context: concept.context,
      points: concept.points,
      caption: buildFullCaption(concept, rendered.music.credit),
      cta: concept.cta,
      contentHash: hash,
      musicUsed: rendered.music.path,
      mediaUrl: rendered.mediaUrl,
      scheduledTime: slot.toISOString(),
      status: "SCHEDULED",
      source,
      revision: 1,
      createdAt: nowIso,
      lastModifiedAt: nowIso,
      publishedAt: null,
      instagramResult: null,
      facebookResult: null,
      threadsResult: null,
      error: null,
    };
    state.reels.push(reel);
    state.lastScheduledTime = slot.toISOString();
    state.lastMusicPath = rendered.music.path;
    if (source === "bank") concept.status = "QUEUED";
    log(`Queued ${conceptId} "${concept.hook}" for ${slot.toISOString()} (music: ${rendered.music.path}, source: ${source})`);
  }

  const availableCount = availableBankConcepts(state).length;
  state.lowContentBankWarning = availableCount < LOW_BANK_WARNING_THRESHOLD;
  if (state.lowContentBankWarning) {
    log(`LOW_CONTENT_BANK warning: only ${availableCount} unused concepts remain in the bank.`);
  }
}

async function publishDue(state, log) {
  for (const reel of dueReels(state)) {
    // Idempotency: never attempt a reel that's already marked published.
    if (reel.status === "PUBLISHED" || reel.instagramResult) continue;

    try {
      reel.instagramResult = await postToInstagram(reel.mediaUrl, reel.caption, true, 1200);
      // Facebook/Threads failures don't block Instagram from counting as
      // published - Instagram is the primary channel and the one this
      // whole pipeline is built around.
      try {
        reel.facebookResult = await postToFacebookPage(reel.mediaUrl, reel.caption, true);
      } catch (e) {
        reel.facebookResult = `FAILED: ${e.message}`;
      }
      try {
        reel.threadsResult = await postToThreads(reel.caption, reel.mediaUrl, true);
      } catch (e) {
        reel.threadsResult = `FAILED: ${e.message}`;
      }
      reel.status = "PUBLISHED";
      reel.publishedAt = new Date().toISOString();
      log(`Published ${reel.conceptId} "${reel.hook}" -> ${reel.instagramResult}`);
    } catch (err) {
      // Instagram result is uncertain here - do NOT retry automatically
      // (would risk a double-post). Mark FAILED and leave it for manual
      // review; it intentionally falls out of dueReels() so it won't be
      // re-attempted next run.
      reel.status = "FAILED";
      reel.error = err.message;
      log(`FAILED to publish ${reel.conceptId} "${reel.hook}": ${err.message}`);
    }
  }
}

export async function runPipeline({ log = console.log } = {}) {
  const state = await loadState();
  try {
    await publishDue(state, log);
    await replenish(state, log);
  } finally {
    await saveState(state);
  }
  return {
    futureQueueCount: futureQueue(state).length,
    totalReels: state.reels.length,
    failedCount: state.reels.filter((r) => r.status === "FAILED").length,
    contentBankAvailable: availableBankConcepts(state).length,
    lowContentBankWarning: !!state.lowContentBankWarning,
  };
}
