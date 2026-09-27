import { postToInstagram } from "../src/social.js";

const url = "https://metfunojdvhpmvrkdhxq.supabase.co/storage/v1/object/public/content/first-post-1790478363473.jpg";
const caption = `You can be growing every month and still feel like nobody actually knows what's going on.

Founders get good at answering "How's business?" with the clean version. Growth. New clients. A good month.

What doesn't come up as often — the 1am thoughts about whether it's sustainable. Making calls nobody else can make. Being the person everyone looks to for answers, even on the days you don't have one.

There's a version of the story only other founders would actually understand.

That's the gap we're trying to close.

If you want to be part of the community we're building, DM "COMMUNITY".`;

postToInstagram(url, caption, false)
  .then((r) => console.log("Instagram:", r))
  .catch((e) => console.log("Instagram FAILED:", e.message));
