import { compileMultiClipReel } from "../src/media.js";
import { uploadToSupabase } from "../src/supabase.js";
import { postToInstagram, postToFacebookPage, postToThreads } from "../src/social.js";
import { isDuplicate, recordPublished } from "../src/contentHistory.js";
import { getNextTrack, recordTrackUsed, getMusicState } from "../src/localMusicRotation.js";

const SOURCE = "Videos folder/tcc with nasheed - HD 1080p - HD 1080p.mov";
const OUT = "scripts/gen/reel-founder-circle.mp4";

const TEMPLATE_FONTS = {
  bold: "C:/Windows/Fonts/arialbd.ttf",
  regular: "C:/Windows/Fonts/arial.ttf",
};

const HASHTAGS =
  "#TCCFoundersClub #TheConnectorClub #StartupPakistan #FoundersClub #Islamabad #Networking #FounderLife";

const topic = "Your inner circle of founders shapes your growth ceiling";

const template = {
  hook: `You Become the Average of the 5 Founders You Talk to Most`,
  context: `Most founders choose their circle by convenience, not by who's actually building something worth learning from. Point 2 is the fix.`,
  points: [
    `If nobody in your circle is ahead of you, you've plateaued without noticing.`,
    `The fastest-growing founders usually swap out at least one relationship every year, not out of unkindness, just outgrowing it.`,
    `A circle that only validates you is comfortable. A circle that challenges you is useful.`,
    `Who you sit next to at dinner shapes more decisions than any book you'll read this year.`,
  ],
  buttonText: "READ CAPTION",
};

// Hard duplicate check before any rendering work happens.
if (isDuplicate(template)) {
  console.error("BLOCKED: this content hashes as a duplicate of an already-published reel.");
  process.exit(1);
}

// Hard audio-rotation check: selected != last used, before rendering.
const musicState = getMusicState();
const track = getNextTrack();
if (track === musicState.lastTrack) {
  console.error("BLOCKED: selected music equals last_music_used.");
  process.exit(1);
}
console.log("Music track for this reel:", track);

const previewLine = `You don't rise above your circle. You rise to meet it. Read the caption.`;

const captionBody = `Nobody tells you this part: your growth ceiling isn't set by your effort. It's set by who you talk to most.

If every founder in your circle is stuck at the same stage you are, that's not a coincidence — it's the ceiling. Comfortable rooms feel good. They just don't move you anywhere.

The founders scaling fastest aren't smarter. They just made sure at least one person in their circle was already a few steps ahead, and let that relationship do some of the work encouragement can't.

Your circle isn't fixed. It's a decision you keep making, on purpose or by default.

DM "TRIBE" to build yours with intention.`;

const captions = {
  instagram: `${previewLine}\n\n${captionBody}\n\n${HASHTAGS}`,
  facebook: `${previewLine}\n\n${captionBody}\n\n${HASHTAGS}`,
  threads: `${previewLine}\n\nDM "TRIBE" to build yours with intention.\n\n${HASHTAGS}`,
};

// Fresh clip selection, distinct from prior segment sets (10/27.5/32 and
// 2/20/50) — source is 68.47s long.
const segments = [
  { start: 8, duration: 4 },
  { start: 38, duration: 4 },
  { start: 60, duration: 4 },
];
const XFADE = 0.4;

async function main() {
  const MUSIC_CREDIT = track.includes("maxko")
    ? `Music: "Powerful" by MaxKoMusic (maxkomusic.com), CC BY-SA 3.0.`
    : `Music: "Powerful Trap Beat" by Alex-Productions, CC BY 3.0.`;
  captions.instagram += `\n\n${MUSIC_CREDIT}`;
  captions.facebook += `\n\n${MUSIC_CREDIT}`;
  captions.threads += `\n\n${MUSIC_CREDIT}`;

  console.log("Compiling 10-second reel...");
  const { totalDuration } = compileMultiClipReel({
    inputPath: SOURCE,
    outputPath: OUT,
    segments,
    template,
    templateFonts: TEMPLATE_FONTS,
    templateOpts: { overlayOpacity: 0.7, grayscale: false, brand: "founders" },
    musicPath: track,
    musicStart: 15,
    xfadeDuration: XFADE,
    targetDuration: 10,
  });
  console.log(`Compiled: ${OUT} (${totalDuration.toFixed(3)}s)`);

  if (Math.abs(totalDuration - 10) > 0.05) {
    console.error(`BLOCKED: output duration ${totalDuration}s is not 10.000s. Aborting before publish.`);
    process.exit(1);
  }

  console.log("Uploading...");
  const publicUrl = await uploadToSupabase(OUT, `reel-founder-circle-${Date.now()}.mp4`, "video/mp4");
  console.log("Uploaded:", publicUrl);

  const results = {};
  try {
    results.Instagram = await postToInstagram(publicUrl, captions.instagram, true, 1200);
  } catch (e) {
    results.Instagram = `FAILED: ${e.message}`;
  }
  try {
    results["Facebook Page"] = await postToFacebookPage(publicUrl, captions.facebook, true);
  } catch (e) {
    results["Facebook Page"] = `FAILED: ${e.message}`;
  }
  try {
    results.Threads = await postToThreads(captions.threads, publicUrl, true);
  } catch (e) {
    results.Threads = `FAILED: ${e.message}`;
  }

  console.log("--- reel results ---");
  for (const [platform, outcome] of Object.entries(results)) {
    console.log(`${platform}: ${outcome}`);
  }

  const anySucceeded = Object.values(results).some((r) => typeof r !== "string" || !r.startsWith("FAILED"));
  if (anySucceeded) {
    recordTrackUsed(track, topic);
    recordPublished({
      topic,
      hook: template.hook,
      context: template.context,
      points: template.points,
      caption: captions.instagram,
      cta: `DM "TRIBE"`,
      musicUsed: track,
      source: "post-reel-founder-circle.js",
    });
    console.log("History updated (music rotation + content history).");
  } else {
    console.log("All platforms failed — history NOT updated, per zero-duplication rule.");
  }
}

main().catch((err) => {
  console.error("Run failed:", err);
  process.exit(1);
});
