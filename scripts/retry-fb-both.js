import { postToFacebookPage } from "../src/social.js";
import { generateCaptions } from "../src/captions.js";

const posts = [
  { url: "https://metfunojdvhpmvrkdhxq.supabase.co/storage/v1/object/public/content/post1-1790515843892.jpg", theme: generateCaptions(0), label: "post1" },
  { url: "https://metfunojdvhpmvrkdhxq.supabase.co/storage/v1/object/public/content/post2-1790516125137.jpg", theme: generateCaptions(1), label: "post2" },
];

async function main() {
  for (const p of posts) {
    try {
      const result = await postToFacebookPage(p.url, p.theme.facebook, false);
      console.log(`${p.label}: ${result}`);
    } catch (e) {
      console.log(`${p.label}: FAILED: ${e.message}`);
    }
  }
}

main();
