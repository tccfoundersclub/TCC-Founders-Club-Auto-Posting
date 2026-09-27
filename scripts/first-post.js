import path from "node:path";
import { uploadToSupabase } from "../src/supabase.js";
import { postToInstagram, postToFacebookPage, postToThreads } from "../src/social.js";

const imagePath = path.join(import.meta.dirname, "first-post.jpg");

const captions = {
  instagram: `You can be growing every month and still feel like nobody actually knows what's going on.

Founders get good at answering "How's business?" with the clean version. Growth. New clients. A good month.

What doesn't come up as often — the 1am thoughts about whether it's sustainable. Making calls nobody else can make. Being the person everyone looks to for answers, even on the days you don't have one.

There's a version of the story only other founders would actually understand.

That's the gap we're trying to close.

If you want to be part of the community we're building, DM "COMMUNITY".`,

  facebook: `You can be growing every month and still feel like nobody actually knows what's going on.

Founders get good at giving the clean update — growth, new clients, a good month. What doesn't come up as often is the 1am thoughts about whether it's sustainable, or being the person everyone looks to for answers on the days you don't have one.

We started this community because that part of the story deserves a room too — founders who've actually been there, having the conversations that don't happen on LinkedIn.

If you want to be part of the community we're building, DM "COMMUNITY".`,

  threads: `You can be growing every month and still feel like nobody actually knows what's going on. That's the part founders don't post about.

If you want to be part of the community we're building, DM "COMMUNITY".`,
};

async function main() {
  console.log("Uploading image to Supabase...");
  const publicUrl = await uploadToSupabase(imagePath, `first-post-${Date.now()}.jpg`, "image/jpeg");
  console.log("Public URL:", publicUrl);

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

  console.log("\n--- First post results ---");
  for (const [platform, outcome] of Object.entries(results)) {
    console.log(`${platform}: ${outcome}`);
  }
}

main();
