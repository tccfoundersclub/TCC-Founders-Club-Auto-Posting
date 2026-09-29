import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The 5 Instagram-native audio tracks approved for TCC Founders Club reels.
// These CANNOT be attached via the Graph API (Instagram doesn't expose a
// native-audio parameter for programmatic Reel publishing - audio must be
// embedded in the uploaded file itself). This module only tracks WHICH of
// the 5 is next in rotation, for the manual step of posting through the
// Instagram app with that audio selected, or for whenever Meta's API adds
// support. It does not attach, download, or embed any of these tracks.
export const APPROVED_AUDIO = [
  { id: "27217832434475071", url: "https://www.instagram.com/reels/audio/27217832434475071/" },
  { id: "36450281231237697", url: "https://www.instagram.com/reels/audio/36450281231237697/" },
  { id: "2927683147420658", url: "https://www.instagram.com/reels/audio/2927683147420658/" },
  { id: "27486744470964048", url: "https://www.instagram.com/reels/audio/27486744470964048/" },
  { id: "675638708785636", url: "https://www.instagram.com/reels/audio/675638708785636/" },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, "..", "audio-rotation-state.json");

function readState() {
  if (!fs.existsSync(STATE_PATH)) {
    return { lastAudioIndex: -1, lastAudioId: null, lastReelPublished: null, history: [] };
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function writeState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

// Returns the next audio in the fixed 01->02->03->04->05->01... rotation,
// guaranteed different from whatever was used last. Does NOT mark it as
// used - call recordAudioUsed() only after the manual attachment actually
// happens, so a reel that's compiled-but-not-yet-manually-posted doesn't
// falsely advance the rotation.
export function getNextAudio() {
  const state = readState();
  const nextIndex = (state.lastAudioIndex + 1) % APPROVED_AUDIO.length;
  return { index: nextIndex, ...APPROVED_AUDIO[nextIndex] };
}

export function recordAudioUsed(index, reelDescription) {
  const state = readState();
  const audio = APPROVED_AUDIO[index];
  state.lastAudioIndex = index;
  state.lastAudioId = audio.id;
  state.lastReelPublished = new Date().toISOString();
  state.history.push({ index, id: audio.id, reel: reelDescription, at: state.lastReelPublished });
  writeState(state);
  return audio;
}

export function getRotationState() {
  return readState();
}
