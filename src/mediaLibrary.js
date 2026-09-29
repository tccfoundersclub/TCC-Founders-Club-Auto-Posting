// Remote (Supabase-hosted) copies of the approved background footage and
// music library, uploaded once via scripts/migrate-media-to-supabase.js.
// The GitHub Actions runner downloads these at render time - nothing about
// rendering depends on any file that only exists on a laptop.
const BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public/content/assets`;

export const BACKGROUND_VIDEO = {
  url: `${BASE}/bg-tcc-with-nasheed.mp4`,
  durationSeconds: 68.47,
};

export const MUSIC_LIBRARY = [
  {
    path: "assets/music-powerful-maxko.mp3",
    url: `${BASE}/music-powerful-maxko.mp3`,
    credit: `Music: "Powerful" by MaxKoMusic (maxkomusic.com), CC BY-SA 3.0.`,
  },
  {
    path: "assets/music-powerful-trap-beat.mp3",
    url: `${BASE}/music-powerful-trap-beat.mp3`,
    credit: `Music: "Powerful Trap Beat" by Alex-Productions, CC BY 3.0.`,
  },
];
