import { compileMultiClipReel } from "../src/media.js";
import { uploadToSupabase } from "../src/supabase.js";
import { postToInstagram, postToFacebookPage, postToThreads } from "../src/social.js";

const SOURCE = "Videos folder/tcc with nasheed - HD 1080p - HD 1080p.mov";
const MUSIC = "Videos folder/music/powerful-maxko.mp3";
const OUT = "scripts/gen/testreel.mp4";

const TEMPLATE_FONTS = {
  bold: "C:/Windows/Fonts/arialbd.ttf",
  regular: "C:/Windows/Fonts/arial.ttf",
};

const MUSIC_CREDIT = `Music: "Powerful" by MaxKoMusic (maxkomusic.com), CC BY-SA 3.0.`;

const HASHTAGS =
  "#TCCFoundersClub #TheConnectorClub #StartupPakistan #FoundersClub #Islamabad #Networking #FounderLife";

const template = {
  hook: `How to Build a Referral Network in a City Where Everyone Says They'll "Grab Coffee" and Never Do`,
  context: `Islamabad has a coffee-meeting culture that rarely converts into real relationships. Point 4 is the actual fix.`,
  points: [
    `A coffee invite with no structure usually gets rescheduled twice and forgotten.`,
    `Real relationship building needs a setting with enough structure to actually happen, not an open-ended "let's catch up."`,
    `The founders who've built real referral networks here usually point to one specific evening, not a string of coffee chats.`,
    `A structured room does in three hours what a year of "let's grab coffee sometime" never quite manages.`,
    `The structure matters as much as the intention.`,
  ],
  buttonText: "READ CAPTION",
};

const previewLine = `Most founders don't need more contacts. They need better rooms. Read the caption.`;

const captionBody = `Everyone says "let's grab coffee sometime." Almost nobody does.

The problem was never mentioned — it's structure. An open-ended coffee invite has nowhere to land, so it reschedules itself into oblivion.

A room with real structure changes that. Three hours, the right people, a reason to be there — relationships start moving the way a year of "let's catch up" never manages.

DM "DINNER" to attend our next Founders Networking Dinner.`;

const captions = {
  instagram: `${previewLine}

${captionBody}

${HASHTAGS}

${MUSIC_CREDIT}`,

  facebook: `${previewLine}

${captionBody}

${HASHTAGS}

${MUSIC_CREDIT}`,

  threads: `${previewLine}

DM "DINNER" to attend our next Founders Networking Dinner.

${HASHTAGS}

${MUSIC_CREDIT}`,
};

const segments = [
  { start: 10, duration: 5 },
  { start: 27.5, duration: 5 },
  { start: 32, duration: 5.5 },
];
const XFADE = 0.4;

async function main() {
  console.log("Compiling locked-template test reel...");
  const { totalDuration } = compileMultiClipReel({
    inputPath: SOURCE,
    outputPath: OUT,
    segments,
    template,
    templateFonts: TEMPLATE_FONTS,
    templateOpts: { overlayOpacity: 0.7, grayscale: false, brand: "founders" },
    musicPath: MUSIC,
    xfadeDuration: XFADE,
  });
  console.log(`Compiled: ${OUT} (${totalDuration.toFixed(2)}s)`);

  console.log("Uploading...");
  const publicUrl = await uploadToSupabase(OUT, `testreel-${Date.now()}.mp4`, "video/mp4");
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

  console.log("--- test reel results ---");
  for (const [platform, outcome] of Object.entries(results)) {
    console.log(`${platform}: ${outcome}`);
  }
}

main().catch((err) => {
  console.error("Run failed:", err);
  process.exit(1);
});
