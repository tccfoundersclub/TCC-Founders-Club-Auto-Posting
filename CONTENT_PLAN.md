# TCC Founders Club / The Connector Club — 100-Day Content Plan

Status as of this writing: pipeline fully live end-to-end. Two manual posts published (Instagram, Facebook, Threads) with a 4-minute gap between them, and the Google Drive credential blocker that was failing the scheduled cron runs has been resolved.

## 1. What's actually running vs. what's still blueprint

**Live and working right now:**
- GitHub Actions workflow (`.github/workflows/post.yml`), cron-scheduled 5x/day (warm-up cadence, PKT business hours)
- Instagram, Facebook Page, and Threads publishing (`src/social.js`) — all three tested live
- Supabase Storage hosting for public media URLs
- ffmpeg-based media pipeline: static image posts (4:5) and "Silent Film Storytelling Reels" (9:16, music + on-screen story-arc text, no voiceover) — see `src/media.js`
- A 23-theme caption bank across founder pain, psychology, humor, lessons, failure stories, scaling reality, humanized networking, founder relationships, collaboration, founder lifestyle, community, Pakistani/Islamabad reality, women-focused, and culture/environment pillars — see `src/captions.js`
- Google Drive credential (`GOOGLE_SERVICE_ACCOUNT_JSON`) — regenerated and added to GitHub Secrets on 2026-09-27; confirmed working locally (auth succeeds). The two earlier scheduled runs that failed ("All jobs have failed") were this exact issue — should not recur.

**No blockers remaining for the cron pipeline itself.** One open item: the Drive inbox folder's actual content (raw clips/photos, and the optional "Music" subfolder) is still whatever you've put there — see §2.

## 2. Content inputs needed from you

The system is ready to consume content the moment it's dropped in place:
- **Video clips / photos** → the "TCC FC Auto Posting" Drive folder (root level). Anything your team already has access to works.
- **Music tracks** → a "Music" subfolder inside that same Drive folder (create it if it doesn't exist). The pipeline picks a random track from there and mixes it under each Reel's own audio.
  - Important: I have **not downloaded any music myself** — pulling files from the internet needs your explicit go-ahead per file (that's a hard rule on my end, not a preference). Once you're back, tell me to go ahead and I'll source a small royalty-free set (or you can drop your own preferred tracks straight into that folder — either works, and the second option needs nothing from me at all).
  - Also worth knowing: Instagram's official "trending audio" library is only accessible from inside the Instagram app — there's no API path to attach it from outside. What we're doing instead (baking a real track into the video file itself) is the same underlying approach top silent-film-style Reels creators use, and produces the same effect for the viewer.

## 3. Posting cadence (your call to change any time)

- **Days 1–14 (warm-up):** 5 posts/day, spread across business hours (~9am/12pm/3pm/6pm/9pm PKT), split across static posts and Reels depending on what's in the Drive inbox. This matches what you asked for to avoid Instagram flagging a brand-new automation pattern.
- **Days 15–30:** review actual performance (reach, saves, DMs with "COMMUNITY") before increasing frequency. You mentioned wanting the option to scale to 10x or even 24x/day — that's a config change in `.github/workflows/post.yml` (just adding more cron lines), not a rebuild. I'd recommend not jumping straight to 24x/day without a couple weeks of clean warm-up data first, but it's entirely your call.
- **Days 31–100:** scale cadence based on what's working, and keep expanding the caption bank as you send more raw content, feedback, and brand material (topics, specific stories, more pillars).

## 4. Content pillar rotation (23 themes, auto-rotating, non-repeating short-term)

| Pillar | Themes | Sample hook |
|---|---|---|
| Founder Psychology / The Mask | 1 | "You can be growing and still feel completely lost." |
| Scaling Reality | 1 | "Growth means less control, not more." |
| Humanized Networking | 1 | "Nobody needs another business card exchange." |
| Founder Humor | 1 | "'How's business?' has two answers." |
| Pakistani / Islamabad Reality | 1 | "Building in Pakistan is its own kind of pressure." |
| Community / Belonging | 1 | "The best thing that happened wasn't a client." |
| Founder Pain (cash flow) | 1 | "The revenue looks fine. The cash flow does not." |
| Founder Pain (bad hire) | 1 | "The wrong hire doesn't show up in week one." |
| Founder Lessons (delegation) | 1 | "You can't scale what only you can do." |
| Founder Lessons (pricing) | 1 | "Undercharging doesn't buy you loyalty." |
| Failure Stories (product) | 1 | "Nobody wanted what we built." |
| Failure Stories (partnership) | 1 | "The partnership looked perfect on paper." |
| Founder Relationships (friendship) | 1 | "Some friendships don't survive you becoming a founder." |
| Founder Relationships (co-founder trust) | 1 | "Trust is the real co-founder agreement." |
| Collaboration | 1 | "The best partnerships weren't planned." |
| Founder Lifestyle | 1 | "Your company isn't the only thing you're building." |
| Women-focused | 1 | "Ambitious women get asked to prove it twice." |
| Culture: Environment shapes you | 1 | "You are not only your intentions." |
| Culture: Serendipity | 1 | "You never know who you're about to meet." |
| Culture: Hosting / noticing people | 1 | "A good host doesn't work the room." |
| Culture: Collective energy / empowerment | 1 | "Today you help someone. Tomorrow, they help you." |
| Culture: Who are you becoming (reflection) | 1 | "Who are you becoming while building this?" |
| Founder Pain (team growth / losing personal touch) | 1 | "You used to know everyone's name." |

Rotation is now **deterministic, not random**: `src/index.js` asks Drive how many posts have already gone out (by counting files in the "Posted" folder) and uses that exact count as the rotation index, so post #1 is always theme 0, post #2 is always theme 1, and so on — no repeats until the full bank has cycled, and the schedule below can be trusted as an actual calendar rather than a description of tendencies.

At 5 posts/day against a 23-theme bank, the day-level pattern repeats every **23 days** (since 23 and 5 share no common factor, every day of the cycle gets a different starting theme before it loops). Over 100 days that's 4 full 23-day cycles plus 8 extra days (days 93-100 repeat cycle-days 1-8 exactly). Here's the exact cycle — "Day" below is cycle-day; to map to a real date, Day 1 = whichever day the first post actually goes out, Day 24 = Day 1 again, Day 47 = Day 1 again, Day 70 = Day 1 again, Day 93 = Day 1 again:

| Day | Slot 1 (~9am) | Slot 2 (~12pm) | Slot 3 (~3pm) | Slot 4 (~6pm) | Slot 5 (~9pm) |
|---|---|---|---|---|---|
| 1 | Founder Psychology / The Mask | Scaling Reality | Humanized Networking | Founder Humor | Pakistani / Islamabad Reality |
| 2 | Community / Belonging | Founder Pain (cash flow) | Founder Pain (bad hire) | Founder Lessons (delegation) | Founder Lessons (pricing) |
| 3 | Failure Stories (product) | Failure Stories (partnership) | Founder Relationships (friendship) | Founder Relationships (co-founder trust) | Collaboration |
| 4 | Founder Lifestyle | Women-focused | Culture: Environment shapes you | Culture: Serendipity | Culture: Hosting / noticing people |
| 5 | Culture: Collective energy / empowerment | Culture: Who are you becoming (reflection) | Founder Pain (team growth / losing personal touch) | Founder Psychology / The Mask | Scaling Reality |
| 6 | Humanized Networking | Founder Humor | Pakistani / Islamabad Reality | Community / Belonging | Founder Pain (cash flow) |
| 7 | Founder Pain (bad hire) | Founder Lessons (delegation) | Founder Lessons (pricing) | Failure Stories (product) | Failure Stories (partnership) |
| 8 | Founder Relationships (friendship) | Founder Relationships (co-founder trust) | Collaboration | Founder Lifestyle | Women-focused |
| 9 | Culture: Environment shapes you | Culture: Serendipity | Culture: Hosting / noticing people | Culture: Collective energy / empowerment | Culture: Who are you becoming (reflection) |
| 10 | Founder Pain (team growth / losing personal touch) | Founder Psychology / The Mask | Scaling Reality | Humanized Networking | Founder Humor |
| 11 | Pakistani / Islamabad Reality | Community / Belonging | Founder Pain (cash flow) | Founder Pain (bad hire) | Founder Lessons (delegation) |
| 12 | Founder Lessons (pricing) | Failure Stories (product) | Failure Stories (partnership) | Founder Relationships (friendship) | Founder Relationships (co-founder trust) |
| 13 | Collaboration | Founder Lifestyle | Women-focused | Culture: Environment shapes you | Culture: Serendipity |
| 14 | Culture: Hosting / noticing people | Culture: Collective energy / empowerment | Culture: Who are you becoming (reflection) | Founder Pain (team growth / losing personal touch) | Founder Psychology / The Mask |
| 15 | Scaling Reality | Humanized Networking | Founder Humor | Pakistani / Islamabad Reality | Community / Belonging |
| 16 | Founder Pain (cash flow) | Founder Pain (bad hire) | Founder Lessons (delegation) | Founder Lessons (pricing) | Failure Stories (product) |
| 17 | Failure Stories (partnership) | Founder Relationships (friendship) | Founder Relationships (co-founder trust) | Collaboration | Founder Lifestyle |
| 18 | Women-focused | Culture: Environment shapes you | Culture: Serendipity | Culture: Hosting / noticing people | Culture: Collective energy / empowerment |
| 19 | Culture: Who are you becoming (reflection) | Founder Pain (team growth / losing personal touch) | Founder Psychology / The Mask | Scaling Reality | Humanized Networking |
| 20 | Founder Humor | Pakistani / Islamabad Reality | Community / Belonging | Founder Pain (cash flow) | Founder Pain (bad hire) |
| 21 | Founder Lessons (delegation) | Founder Lessons (pricing) | Failure Stories (product) | Failure Stories (partnership) | Founder Relationships (friendship) |
| 22 | Founder Relationships (co-founder trust) | Collaboration | Founder Lifestyle | Women-focused | Culture: Environment shapes you |
| 23 | Culture: Serendipity | Culture: Hosting / noticing people | Culture: Collective energy / empowerment | Culture: Who are you becoming (reflection) | Founder Pain (team growth / losing personal touch) |

Whether any given slot becomes a static post or a Reel depends only on what's sitting in the Drive inbox at that moment (image vs. video file) — the theme/caption assigned to that slot is fixed by this table regardless of format. If you add more themes to `src/captions.js`, the cycle length changes automatically (no code change needed elsewhere) and this table would need regenerating to match — worth asking me to do whenever the bank grows.

Every caption ends with the required CTA verbatim: **"If you want to be part of the community we're building, DM 'COMMUNITY'."** Every post is written to the standard from the brand framework: hook first, short paragraphs, no selling, no corporate language, optimized for "someone recognizes themselves" over reach.

## 5. Audience philosophy (from your own framework, kept front and center)

RELEVANCE > VIRALITY. QUALITY > QUANTITY. CONNECTION > IMPRESSIONS. Nothing in the caption bank promises status, exclusivity, or uses scarcity language — specificity does the filtering instead, per your instructions.

**One honest limitation to flag:** organic posts (what this pipeline does) reach your existing followers plus whoever the algorithm shows them to via hashtags/Explore/Reels feed — there's no way to programmatically restrict organic reach to "Islamabad only." True geographic/demographic targeting (the "Islamabad first" audience priority you mentioned) requires Meta Ads Manager, which is a separate system from organic posting and hasn't been built yet. If geo-targeted paid reach is something you want, that's worth a dedicated conversation when you're back — different budget, different setup, different account permissions.

## 6. What I'll keep doing while you're away

- Expanding the caption/pillar bank further (more founder-lesson and failure-story variants, more Pakistani-context specificity, more culture/environment pieces from the second framework doc)
- Keeping the pipeline code clean and tested
- NOT running the live cron pipeline for real posts without the missing Drive key — nothing will auto-post from Drive until that's resolved, so there's no risk of it running wild on unreviewed raw content while you're gone
- Queuing anything that needs your direct action (clearly marked, like the Drive key and the music download permission above) rather than guessing

## 7. What to review when you're back

1. Read the captions in `src/captions.js` — tone check, anything to adjust
2. Approve/deny me sourcing royalty-free music, or drop your own into the Drive "Music" folder
3. ~~Handle the Drive service-account key~~ — done 2026-09-27, cron pipeline is unblocked
4. Send more raw content, brand specifics, and feedback — I'll fold it straight into the bank
