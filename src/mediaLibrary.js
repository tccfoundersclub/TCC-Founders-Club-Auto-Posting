// Remote (Supabase-hosted) copies of the approved background footage and
// music library, uploaded once via scripts/migrate-media-to-supabase.js.
// The GitHub Actions runner downloads these at render time - nothing about
// rendering depends on any file that only exists on a laptop.
const BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public/content/assets`;

export const BACKGROUND_VIDEO = {
  url: `${BASE}/bg-tcc-with-nasheed.mp4`,
  durationSeconds: 68.47,
};

// Both current tracks are Creative Commons licensed, which legally requires
// attribution wherever the work is used - that's a real license term, not
// something we can silently drop. See content-library/SYSTEM-MAP.md for the
// full audit. Resolution: attribution is posted as an automated Instagram
// comment immediately after publish (src/social.js postToInstagram's
// commentText param) instead of living in the caption - this satisfies both
// "no production metadata in the caption" AND the license's attribution
// requirement. Per that same audit, licenseStatus is recorded explicitly so
// a future track can be checked the same way before being approved.
export const MUSIC_LIBRARY = [
  {
    path: "assets/music-powerful-maxko.mp3",
    url: `${BASE}/music-powerful-maxko.mp3`,
    credit: `Music: "Powerful" by MaxKoMusic (maxkomusic.com), CC BY-SA 3.0.`,
    license: "CC BY-SA 3.0",
    licenseStatus: "ATTRIBUTION_REQUIRED", // approved for use ONLY via comment-based attribution, never caption-only
  },
  {
    path: "assets/music-powerful-trap-beat.mp3",
    url: `${BASE}/music-powerful-trap-beat.mp3`,
    credit: `Music: "Powerful Trap Beat" by Alex-Productions, CC BY 3.0.`,
    license: "CC BY 3.0",
    licenseStatus: "ATTRIBUTION_REQUIRED", // approved for use ONLY via comment-based attribution, never caption-only
  },
];
