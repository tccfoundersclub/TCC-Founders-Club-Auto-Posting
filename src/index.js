import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getDriveAccessToken } from "./googleAuth.js";
import { pickNextFile, downloadFile, markAsPosted, pickMusicTrack, countPosted } from "./drive.js";
import { isVideo, compileImage, compileReel } from "./media.js";
import { uploadToSupabase } from "./supabase.js";
import { generateCaptions } from "./captions.js";
import { postToInstagram, postToFacebookPage, postToThreads } from "./social.js";

async function main() {
  console.log("Starting TCC Founders Club auto-post run...");

  const driveToken = await getDriveAccessToken();
  const file = await pickNextFile(driveToken);

  if (!file) {
    console.log("No unposted content found in the Drive inbox. Nothing to do.");
    return;
  }
  console.log(`Selected: ${file.name} (${file.id})`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tcc-"));
  const rawPath = path.join(tmpDir, file.name);
  await downloadFile(file.id, driveToken, rawPath);

  const video = isVideo(file.name);
  const postIndex = await countPosted(driveToken);
  const captions = generateCaptions(postIndex);
  console.log(`Post #${postIndex + 1} - theme index ${postIndex % 23}`);
  const outPath = path.join(tmpDir, video ? "out.mp4" : "out.jpg");

  if (video) {
    // Video posts become "Silent Film Storytelling Reels": music + B-roll +
    // an on-screen story arc (hook -> tension -> CTA), no voiceover needed.
    let musicPath = null;
    const track = await pickMusicTrack(driveToken);
    if (track) {
      musicPath = path.join(tmpDir, track.name);
      await downloadFile(track.id, driveToken, musicPath);
      console.log(`Using music track: ${track.name}`);
    } else {
      console.log("No music library found in Drive (Music subfolder) - posting with original clip audio only.");
    }
    compileReel({ inputPath: rawPath, outputPath: outPath, beats: captions.beats, musicPath });
  } else {
    compileImage(rawPath, outPath);
  }

  const remoteFileName = `${Date.now()}-${path.basename(outPath)}`;
  const contentType = video ? "video/mp4" : "image/jpeg";
  const publicUrl = await uploadToSupabase(outPath, remoteFileName, contentType);
  console.log(`Uploaded to: ${publicUrl}`);

  const results = {};

  try {
    results.Instagram = await postToInstagram(publicUrl, captions.instagram, video);
  } catch (e) {
    results.Instagram = `FAILED: ${e.message}`;
  }

  try {
    results["Facebook Page"] = await postToFacebookPage(publicUrl, captions.facebook, video);
  } catch (e) {
    results["Facebook Page"] = `FAILED: ${e.message}`;
  }

  try {
    results.Threads = await postToThreads(captions.threads, publicUrl, video);
  } catch (e) {
    results.Threads = `FAILED: ${e.message}`;
  }

  console.log("\n--- Results ---");
  for (const [platform, outcome] of Object.entries(results)) {
    console.log(`${platform}: ${outcome}`);
  }

  await markAsPosted(file.id, driveToken);
  console.log(`Marked "${file.name}" as posted.`);
}

main().catch((err) => {
  console.error("Run failed:", err);
  process.exit(1);
});
