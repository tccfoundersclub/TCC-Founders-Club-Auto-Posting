// Render-only validation for the TCC Reel Style Studio integration. Renders
// local MP4 files for manual review - never uploads to Supabase, never
// touches state.reels/state.contentBank, never calls any publish function.
// Safe to run any time; it cannot affect the live queue or publish state.
//
// Usage: node --env-file=.env scripts/render-style-previews.js [outDir]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compileMultiClipReel } from "../src/media.js";
import { loadStyleConfig } from "../src/styleConfig.js";
import { loadState, availableBankConcepts } from "../src/remoteState.js";
import { BACKGROUND_VIDEO, MUSIC_LIBRARY } from "../src/mediaLibrary.js";

const outDir = process.argv[2] || path.join(os.tmpdir(), "tcc-style-previews");
fs.mkdirSync(outDir, { recursive: true });

async function downloadToTmp(url, filename) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download ${url}: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const tmpPath = path.join(os.tmpdir(), filename);
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
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

async function render(label, outPath, { hook, insight, cta, brand }, styleOpts, bgPath, musicPath) {
  console.log(`\n--- Rendering: ${label} ---`);
  const styleConfig = loadStyleConfig();
  const { totalDuration } = compileMultiClipReel({
    inputPath: bgPath,
    outputPath: outPath,
    segments: pickSegments(hook),
    styleTemplate: { hook, insight, cta: cta || "READ CAPTION", brand: brand || "TCC FOUNDERS CLUB" },
    styleConfig,
    styleOpts,
    musicPath,
    musicStart: 15,
    xfadeDuration: 0.4,
    targetDuration: 10,
  });
  console.log(`OK: ${label} -> ${outPath} (compiled ${totalDuration}s)`);
  return outPath;
}

async function main() {
  console.log("Loading real content-bank concepts for realistic preview text (read-only, state untouched)...");
  const state = await loadState();
  const available = availableBankConcepts(state);
  const sample1 = available[0];
  const sample2 = available[1] || available[0];
  if (!sample1) throw new Error("No available content-bank concepts to preview with.");

  console.log("Downloading background video + music (read-only)...");
  const bgPath = await downloadToTmp(BACKGROUND_VIDEO.url, `preview-bg-${Date.now()}.mp4`);
  const musicPath = await downloadToTmp(MUSIC_LIBRARY[0].url, `preview-music-${Date.now()}.mp3`);

  const results = { rendered: [], failures: [] };

  // 1. Default treatment: Inter/Inter, white panels
  try {
    const p = path.join(outDir, "preview-1-default-inter-white-panel.mp4");
    await render(
      "Default (Inter/Inter, white-panel)",
      p,
      { hook: sample1.hook, insight: sample1.context, cta: "READ CAPTION" },
      {}, // uses styleConfig defaults
      bgPath,
      musicPath
    );
    results.rendered.push(p);
  } catch (e) {
    results.failures.push({ label: "default", error: e.message });
    console.error("FAILED (default):", e.message);
  }

  // 2. Alternate pairing: Cormorant Garamond / Manrope
  try {
    const p = path.join(outDir, "preview-2-cormorant-manrope.mp4");
    await render(
      "Alternate pairing (Cormorant Garamond / Manrope)",
      p,
      { hook: sample2.hook, insight: sample2.context, cta: "READ CAPTION" },
      { fontPairing: "cormorant-manrope" },
      bgPath,
      musicPath
    );
    results.rendered.push(p);
  } catch (e) {
    results.failures.push({ label: "cormorant-manrope", error: e.message });
    console.error("FAILED (cormorant-manrope):", e.message);
  }

  // 3. Long-copy stress test - deliberately over the style guide's word/line
  // guidance, to see how wrapping/truncation behaves rather than assume it.
  try {
    const p = path.join(outDir, "preview-3-long-copy-stress-test.mp4");
    await render(
      "Long-copy stress test",
      p,
      {
        hook: "This Hook Is Deliberately Much Longer Than The Four To Eight Word Guidance And Should Reveal How Line Wrapping And Truncation Actually Behaves",
        insight: "This insight line is also deliberately written as a long run-on sentence that exceeds the one-to-two-line guidance from the style guide so the wrapping and clipping behavior can be inspected directly in the rendered frame rather than assumed from the code alone.",
        cta: "READ CAPTION",
      },
      {},
      bgPath,
      musicPath
    );
    results.rendered.push(p);
  } catch (e) {
    results.failures.push({ label: "long-copy", error: e.message });
    console.error("FAILED (long-copy):", e.message);
  }

  // 4. Deliberate failure case: unknown font pairing. Confirms the error is
  // thrown clearly (not silently substituted) and that nothing written by
  // this script ever touches remote state - trivially true here since this
  // script never imports saveState or any publish function at all.
  console.log("\n--- Deliberate failure test: unknown font pairing ---");
  try {
    await render(
      "Deliberate failure (bad pairing)",
      path.join(outDir, "should-not-exist.mp4"),
      { hook: sample1.hook, insight: sample1.context, cta: "READ CAPTION" },
      { fontPairing: "does-not-exist" },
      bgPath,
      musicPath
    );
    console.error("UNEXPECTED: the bad-pairing render should have thrown and did not.");
    results.failures.push({ label: "deliberate-failure-test", error: "did not throw as expected" });
  } catch (e) {
    console.log(`OK (expected failure): ${e.message}`);
    results.rendered.push({ expectedFailure: true, message: e.message });
  }

  for (const p of [bgPath, musicPath]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Output dir: ${outDir}`);
  console.log(`Rendered/passed: ${results.rendered.length}`);
  console.log(`Unexpected failures: ${results.failures.length}`);
  if (results.failures.length) {
    results.failures.forEach((f) => console.log(`  - ${f.label}: ${f.error}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("SCRIPT FAILED:", e);
  process.exit(1);
});
