# Hashtag System

Researched via live web search (not invented from memory) — see Sources at the bottom. Implemented in `src/hashtags.js` (`selectHashtags()`).

## Critical finding that shapes this whole system

Instagram capped hashtags at **5 per post in December 2025**. Posts with more than 5 get demoted from Explore/Reels recommendations, and Instagram may strip the excess or block publishing outright. The old caption template used **7** hashtags on every single post — actively working against reach. Every hashtag selection is now hard-capped at 5.

Instagram also now indexes caption text, on-screen text, and spoken words for discovery — hashtags are no longer the primary discovery mechanism they once were. This is why Part 8 (natural keywords in the caption prose) matters as much as the hashtag pools themselves.

## Selection logic (per reel, automatic, no manual tagging needed)

1. **1 branded tag** — alternates between `#TCCFoundersClub` / `#FoundersClub` (deterministic by concept ID, so it varies but is reproducible)
2. **Up to 2-3 topic-matched niche tags** — the concept's topic/hook/context text is scanned for trigger keywords (e.g. "co-founder", "hiring", "pricing") and mapped to the matching category's tags. Falls back to a generic ICP pool (`#StartupFounder #Entrepreneurs #FounderCommunity #BusinessOwners`) only if nothing matches.
3. **1 local tag** — rotates through `#Pakistan #Islamabad #Lahore #Karachi #StartupPakistan`, only added if there's room left under the 5-tag cap. Never forces Islamabad onto every post (Part 10).

Total is always ≤ 5, always topic-relevant, never a copy-pasted static block.

## Topic pools (trigger keywords → hashtags)

| Category | Trigger keywords | Hashtags |
|---|---|---|
| Co-founders | co-founder, cofounder | #Cofounders #StartupTeams |
| Hiring / Teams | hire, hiring, candidate, onboarding, recruit | #Hiring #TeamBuilding |
| Leadership | leader, leadership, manage, management | #Leadership #FounderMindset |
| Networking / Community | network, relationship, referral, introduction, community | #FounderNetworking #StartupCommunity |
| Sales / Growth | sales, pricing, revenue, customer, churn, growth | #B2BSales #StartupGrowth |
| SaaS | saas, subscription, renewal, product-market fit | #SaaSFounder #B2BFounder |
| Agency | agency, client, freelanc(ing/er) | #AgencyOwners #DigitalAgency |
| Software / IT | software, engineer, developer, tech founder, product | #TechFounder #SoftwareHouse |
| Remote work | remote, distributed team | #RemoteTeams #RemoteWork |
| Founder psychology | burnout, lonely/loneliness, identity, stress, anxiety, mental | #FounderMindset #FounderLife |
| Women founders | women founder, female founder, woman-owned | #WomenFounders #WomenInTech |
| Partnerships | partner, investor, board | #StartupPartnerships #Fundraising |

## Local pool

`#Pakistan #Islamabad #Lahore #Karachi #StartupPakistan`

Research confirmed Lahore, Karachi, and Islamabad are all genuine, distinct tech hubs (Lahore ranked 4th in South Asia for startup activity per the research below) — rotating across all of them is more accurate than always defaulting to Islamabad.

## Sources

- [Instagram to cap hashtags at five per post](https://www.globaldatinginsights.com/featured/instagram-to-cap-hashtags-at-five-per-post/)
- [Instagram puts a limit on hashtag usage](https://betanews.com/2025/12/19/instagram-puts-a-limit-on-hashtag-usage/)
- [Why Instagram limited hashtags — recent updates](https://www.lilachbullock.com/why-instagram-limited-hashtags-recent-updates/)
- [Instagram limits number of hashtags to five per post](https://www.socialsamosa.com/news-2/instagram-hashtags-five-per-post-10923075)
- [flick.social — entrepreneur/startup hashtag data](https://www.flick.social/learn/hashtags/entrepreneurs)
- [flick.social — digital marketing agency hashtags](https://www.flick.social/learn/hashtags/digitalmarketingagency)
- [flick.social — women in business hashtags](https://www.flick.social/learn/hashtags/womeninbusiness)
- [displaypurposes.com — #founder hashtag data](https://displaypurposes.com/hashtags/hashtag/founder)

*Last researched: 2026-09-29. Re-run the research if this file is more than a few months old — Instagram's hashtag rules changed materially in Dec 2025 and could change again.*
