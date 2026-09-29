import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Rotates through whatever's actually in the local music folder (distinct
// from audioRotation.js, which tracks the 5 Instagram-native audio tracks
// for manual posting - this one is for the royalty-free tracks we embed
// directly into auto-published reels).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MUSIC_DIR = path.join(__dirname, "..", "Videos folder", "music");
const STATE_PATH = path.join(__dirname, "..", "music-rotation-state.json");

export function listLocalTracks() {
  return fs
    .readdirSync(MUSIC_DIR)
    .filter((f) => /\.(mp3|wav|m4a|aac)$/i.test(f))
    .sort()
    .map((f) => path.join(MUSIC_DIR, f));
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) return { lastTrack: null, history: [] };
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function writeState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

// Picks a track that isn't the one used last time. If there's only one
// track in the folder, there's nothing to rotate to - returns it anyway
// (can't satisfy "never consecutive" with a single-track library) but logs
// that fact so it's visible rather than silently ignored.
export function getNextTrack() {
  const tracks = listLocalTracks();
  if (tracks.length === 0) throw new Error("No local music tracks found in Videos folder/music/");
  const state = readState();
  const candidates = tracks.filter((t) => t !== state.lastTrack);
  if (candidates.length === 0) {
    console.warn("Only one local track available - cannot avoid repeating it.");
    return tracks[0];
  }
  // Rotate deterministically: pick the candidate that was used longest ago
  // (or never), not just the first alphabetically.
  const lastIndex = state.history || [];
  const scored = candidates.map((t) => {
    const idx = [...lastIndex].reverse().findIndex((h) => h.track === t);
    return { t, sinceUse: idx === -1 ? Infinity : idx };
  });
  scored.sort((a, b) => b.sinceUse - a.sinceUse);
  return scored[0].t;
}

export function recordTrackUsed(trackPath, reelDescription) {
  const state = readState();
  state.lastTrack = trackPath;
  state.history = state.history || [];
  state.history.push({ track: trackPath, reel: reelDescription, at: new Date().toISOString() });
  writeState(state);
}

export function getMusicState() {
  return readState();
}
