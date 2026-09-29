// Topic-aware hashtag selection + a caption sanitizer that strips any
// production/licensing metadata that should never reach an Instagram
// caption. See content-library/HASHTAGS.md and content-library/KEYWORDS.md
// for the research behind these pools and citations.
//
// Instagram capped posts at 5 hashtags in December 2025 - posts over that
// get demoted from Explore/Reels recommendations (confirmed via research,
// see HASHTAGS.md sources). Every selection here is hard-capped at 5.
const MAX_HASHTAGS = 5;

const BRANDED = ["#TCCFoundersClub", "#FoundersClub"];

// category -> hashtags. Selected when the concept's text matches a trigger
// keyword for that category.
const TOPIC_POOLS = {
  cofounders: { triggers: ["co-founder", "cofounder"], tags: ["#Cofounders", "#StartupTeams"] },
  hiring: { triggers: ["hire", "hiring", "candidate", "onboarding", "recruit"], tags: ["#Hiring", "#TeamBuilding"] },
  leadership: { triggers: ["leader", "leadership", "manage", "management"], tags: ["#Leadership", "#FounderMindset"] },
  networking: { triggers: ["network", "relationship", "referral", "introduction", "community"], tags: ["#FounderNetworking", "#StartupCommunity"] },
  salesGrowth: { triggers: ["sales", "pricing", "revenue", "customer", "churn", "growth"], tags: ["#B2BSales", "#StartupGrowth"] },
  saas: { triggers: ["saas", "subscription", "renewal", "product-market fit"], tags: ["#SaaSFounder", "#B2BFounder"] },
  agency: { triggers: ["agency", "client", "freelanc"], tags: ["#AgencyOwners", "#DigitalAgency"] },
  software: { triggers: ["software", "engineer", "developer", "tech founder", "product"], tags: ["#TechFounder", "#SoftwareHouse"] },
  remote: { triggers: ["remote", "distributed team"], tags: ["#RemoteTeams", "#RemoteWork"] },
  founderPsychology: { triggers: ["burnout", "lonel", "identity", "stress", "anxiety", "mental"], tags: ["#FounderMindset", "#FounderLife"] },
  women: { triggers: ["women founder", "female founder", "woman-owned"], tags: ["#WomenFounders", "#WomenInTech"] },
  partnerships: { triggers: ["partner", "investor", "board"], tags: ["#StartupPartnerships", "#Fundraising"] },
};

// Generic fallback pool used when no topic keyword matches - still niche
// ICP-relevant, not generic engagement bait.
const GENERIC_NICHE = ["#StartupFounder", "#Entrepreneurs", "#FounderCommunity", "#BusinessOwners"];

const LOCAL = ["#Pakistan", "#Islamabad", "#Lahore", "#Karachi", "#StartupPakistan"];

function hashCode(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function matchTopicPools(text) {
  const lower = text.toLowerCase();
  const matched = [];
  for (const pool of Object.values(TOPIC_POOLS)) {
    if (pool.triggers.some((t) => lower.includes(t))) matched.push(...pool.tags);
  }
  return matched;
}

// Deterministic (reproducible for the same conceptId) but varied across
// concepts - satisfies "don't blindly copy the same block every time"
// without needing an LLM or true randomness.
export function selectHashtags(concept, conceptId) {
  const text = `${concept.topic} ${concept.hook} ${concept.context}`;
  const topicTags = [...new Set(matchTopicPools(text))];
  const seed = hashCode(conceptId || concept.hook);

  const tags = [];
  tags.push(BRANDED[seed % BRANDED.length]);

  const nicheSource = topicTags.length ? topicTags : GENERIC_NICHE;
  for (let i = 0; tags.length < MAX_HASHTAGS - 1 && i < nicheSource.length; i++) {
    const candidate = nicheSource[(seed + i) % nicheSource.length];
    if (!tags.includes(candidate)) tags.push(candidate);
  }

  if (tags.length < MAX_HASHTAGS) {
    const localTag = LOCAL[seed % LOCAL.length];
    if (!tags.includes(localTag)) tags.push(localTag);
  }

  return tags.slice(0, MAX_HASHTAGS);
}

// Defense-in-depth: strips any line that looks like production/licensing
// metadata, even if it somehow ended up in a caption (e.g. a hand-written
// batch concept that copied an old template). Never silently allow this
// text into a published caption.
const METADATA_LINE_PATTERN = /^(music|track|song|audio|artist|music by|credit|courtesy|source|license|licence|copyright|royalty free)\s*:/i;
const METADATA_KEYWORD_PATTERN = /(CC\s*BY(-SA)?|maxkomusic\.com|pixabay|youtube audio library|\.mp3\b)/i;

export function sanitizeCaption(caption) {
  const cleaned = caption
    .split("\n")
    .filter((line) => !METADATA_LINE_PATTERN.test(line.trim()) && !METADATA_KEYWORD_PATTERN.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned;
}
