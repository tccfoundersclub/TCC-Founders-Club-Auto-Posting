import { loadState, saveState } from "../src/remoteState.js";
import { selectHashtags, sanitizeCaption } from "../src/hashtags.js";
import { MUSIC_LIBRARY } from "../src/mediaLibrary.js";

// One-off cleanup: strips music-credit text and the old static 7-hashtag
// block from every currently SCHEDULED (not yet published) reel's caption,
// and rebuilds it with the new topic-aware, 5-hashtag-capped system.
// PUBLISHED reels are never touched - their historical record stays intact.
// Hook, video, schedule, music, and concept ID are never touched either -
// only the caption text itself.
const OLD_HASHTAG_BLOCK =
  "#TCCFoundersClub #TheConnectorClub #StartupPakistan #FoundersClub #Islamabad #Networking #FounderLife";

async function main() {
  const state = await loadState();
  const scheduled = state.reels.filter((r) => r.status === "SCHEDULED");
  console.log(`Found ${scheduled.length} SCHEDULED reels to check.`);

  let cleaned = 0;
  for (const reel of scheduled) {
    const before = reel.caption;

    // Recover the original hand-written caption text by cutting at the
    // known old hashtag block (present on every reel queued before today).
    let base = before;
    const idx = before.indexOf(OLD_HASHTAG_BLOCK);
    if (idx !== -1) base = before.slice(0, idx).trim();
    // Defense-in-depth in case any reel's format differs.
    base = sanitizeCaption(base);

    const hashtags = selectHashtags({ topic: reel.topic, hook: reel.hook, context: reel.context }, reel.conceptId).join(" ");
    const after = sanitizeCaption(`${base}\n\n${hashtags}`);

    if (!reel.musicCredit) {
      const track = MUSIC_LIBRARY.find((m) => m.path === reel.musicUsed);
      reel.musicCredit = track ? track.credit : null;
    }

    if (after !== before) {
      reel.caption = after;
      reel.lastModifiedAt = new Date().toISOString();
      reel.revision = (reel.revision || 1) + 1;
      cleaned++;
      console.log(`Cleaned ${reel.conceptId}: "${reel.hook}"`);
      console.log(`  new hashtags: ${hashtags}`);
      console.log(`  musicCredit moved to: ${reel.musicCredit}`);
    }
  }

  await saveState(state);
  console.log(`\nCleaned ${cleaned} / ${scheduled.length} scheduled reels. Published reels untouched.`);
}

main().catch((err) => {
  console.error("clean-scheduled-captions failed:", err);
  process.exit(1);
});
