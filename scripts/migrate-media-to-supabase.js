import { uploadToSupabase } from "../src/supabase.js";

// One-off migration: uploads the approved background video and music
// library to Supabase Storage so the remote GitHub Actions runner can
// render reels without any local files. Safe to re-run (upsert).
const ASSETS = [
  { local: "Videos folder/bg-tcc-with-nasheed-compressed.mp4", remote: "assets/bg-tcc-with-nasheed.mp4", type: "video/mp4" },
  { local: "Videos folder/music/powerful-maxko.mp3", remote: "assets/music-powerful-maxko.mp3", type: "audio/mpeg" },
  { local: "Videos folder/music/powerful-trap-beat.mp3", remote: "assets/music-powerful-trap-beat.mp3", type: "audio/mpeg" },
];

async function main() {
  for (const asset of ASSETS) {
    console.log(`Uploading ${asset.local} -> ${asset.remote} ...`);
    const url = await uploadToSupabase(asset.local, asset.remote, asset.type);
    console.log(`  OK: ${url}`);
  }
  console.log("\nMigration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
