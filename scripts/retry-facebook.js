import { postToFacebookPage } from "../src/social.js";

const url = "https://metfunojdvhpmvrkdhxq.supabase.co/storage/v1/object/public/content/first-post-1790478363473.jpg";
const caption = `You can be growing every month and still feel like nobody actually knows what's going on.

Founders get good at giving the clean update — growth, new clients, a good month. What doesn't come up as often is the 1am thoughts about whether it's sustainable, or being the person everyone looks to for answers on the days you don't have one.

We started this community because that part of the story deserves a room too — founders who've actually been there, having the conversations that don't happen on LinkedIn.

If you want to be part of the community we're building, DM "COMMUNITY".`;

postToFacebookPage(url, caption, false)
  .then((r) => console.log("Facebook Page:", r))
  .catch((e) => console.log("Facebook Page FAILED:", e.message));
