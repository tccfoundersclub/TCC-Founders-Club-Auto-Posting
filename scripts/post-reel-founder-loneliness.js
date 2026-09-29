import { compileMultiClipReel } from "../src/media.js";
import { uploadToSupabase } from "../src/supabase.js";
import { postToInstagram, postToFacebookPage, postToThreads } from "../src/social.js";
import { isDuplicate, recordPublished } from "../src/contentHistory.js";
import { getNextTrack, recordTrackUsed } from "../src/localMusicRotation.js";

const SOURCE = "Videos folder/tcc with nasheed - HD 1080p - HD 1080p.mov";
const OUT = "scripts/gen/reel-founder-loneliness.mp4";

const TEMPLATE_FONTS = {
  bold: "C:/Windows/Fonts/arialbd.ttf",
  regular: "C:/Windows/Fonts/arial.ttf",
};

const HASHTAGS =
  "#TCCFoundersClub #TheConnectorClub #StartupPakistan #FoundersClub #Islamabad #Networking #FounderLife";

const topic = "Why founders stop asking for help right when they need it most";

const template = {
  hook: `Why Founders Stop Asking for Help Right When They Need It Most`,
  context: `The higher you climb, the fewer people you tell when something's actually wrong. Point 3 is why that's backwards.`,
  points: [
    `Early on, asking for help feels normal. Six figures in, it starts to feel like a confession.`,
    `Most founders don't hide struggle because they're arrogant. They hide it because they're not sure who's safe to tell.`,
    `The founders who recover fastest from a bad quarter are usually the ones who said something out loud in week one, not week twelve.`,
    `Silence doesn't protect the company. It just delays the moment someone finds out anyway.`,
  ],
  buttonText: "READ CAPTION",
};

// Duplicate check against content-history.json before doing any rendering work.
if (isDuplicate(template)) {
  console.error("BLOCKED: this content hashes as a duplicate of an already-published reel.");
  process.exit(1);
}

const previewLine = `Most founders don't need more contacts. They need one person they can actually tell. Read the caption.`;

const captionBody = `"How's it going?" "Good, good, busy." That's the answer almost every founder gives, even when it isn't true.

Early on, saying "I'm struggling" is just normal conversation. Somewhere past the first big milestone, it starts to feel like admitting you're not cut out for this. So founders stop saying it, right when they need to say it most.

That silence doesn't protect the company. It just delays the moment someone finds out anyway — usually later, and usually worse than it needed to be.

The founders who recover fastest aren't the ones who never struggle. They're the ones who have somewhere to say it out loud in week one, not week twelve.

DM "TRIBE" to find your room.`;

const captions = {
  instagram: `${previewLine}\n\n${captionBody}\n\n${HASHTAGS}`,
  facebook: `${previewLine}\n\n${captionBody}\n\n${HASHTAGS}`,
  threads: `${previewLine}\n\nDM "TRIBE" to find your room.\n\n${HASHTAGS}`,
};

// Fresh clip selection (distinct from the 10/27.5/32 starts used on prior
// reels) — source is 68.47s long. Three segments deliberately overlap-summed
// past 10s so the explicit targetDuration trim below only ever shortens.
const segments = [
  { start: 2, duration: 4 },
  { start: 20, duration: 4 },
  { start: 50, duration: 4 },
];
const XFADE = 0.4;

async function main() {
  const track = getNextTrack();
  console.log("Music track for this reel:", track);

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
    musicStart: 25,
    xfadeDuration: XFADE,
    targetDuration: 10,
  });
  console.log(`Compiled: ${OUT} (${totalDuration.toFixed(3)}s)`);

  if (Math.abs(totalDuration - 10) > 0.05) {
    console.error(`BLOCKED: output duration ${totalDuration}s is not 10.000s. Aborting before publish.`);
    process.exit(1);
  }

  console.log("Uploading...");
  const publicUrl = await uploadToSupabase(OUT, `reel-founder-loneliness-${Date.now()}.mp4`, "video/mp4");
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
      source: "post-reel-founder-loneliness.js",
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
