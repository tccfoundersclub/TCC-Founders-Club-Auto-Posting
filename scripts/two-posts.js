import path from "node:path";
import { uploadToSupabase } from "../src/supabase.js";
import { postToInstagram, postToFacebookPage, postToThreads } from "../src/social.js";
import { generateCaptions } from "../src/captions.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const posts = [
  { image: path.join(import.meta.dirname, "gen", "post1.jpg"), theme: generateCaptions(0) },
  { image: path.join(import.meta.dirname, "gen", "post2.jpg"), theme: generateCaptions(1) },
];

async function publishOne(image, captions, label) {
  console.log(`\n=== Publishing ${label} ===`);
  const publicUrl = await uploadToSupabase(image, `${label}-${Date.now()}.jpg`, "image/jpeg");
  console.log("Uploaded:", publicUrl);

  const results = {};
  try {
    results.Instagram = await postToInstagram(publicUrl, captions.instagram, false);
  } catch (e) {
    results.Instagram = `FAILED: ${e.message}`;
  }
  try {
    results["Facebook Page"] = await postToFacebookPage(publicUrl, captions.facebook, false);
  } catch (e) {
    results["Facebook Page"] = `FAILED: ${e.message}`;
  }
  try {
    results.Threads = await postToThreads(captions.threads, publicUrl, false);
  } catch (e) {
    results.Threads = `FAILED: ${e.message}`;
  }

  console.log(`--- ${label} results ---`);
  for (const [platform, outcome] of Object.entries(results)) {
    console.log(`${platform}: ${outcome}`);
  }
  return results;
}

async function main() {
  await publishOne(posts[0].image, posts[0].theme, "post1");

  console.log("\nWaiting 4 minutes before the second post...");
  await sleep(4 * 60 * 1000);

  await publishOne(posts[1].image, posts[1].theme, "post2");

  console.log("\nBoth posts done.");
}

main().catch((err) => {
  console.error("Run failed:", err);
  process.exit(1);
});
