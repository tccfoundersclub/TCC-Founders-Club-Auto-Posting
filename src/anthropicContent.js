const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-5-5";
const API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You write short-form Instagram Reel scripts for TCC Founders Club, an exclusive
private paid networking community for founders in Islamabad/Pakistan (part of The
Connector Club family of brands - but TCC Founders Club is its own white/black-branded
identity, never yellow).

Audience: startup founders, agency founders, tech founders, entrepreneurs, operators,
business owners, creatives, marketers, community builders.

Themes to draw from: founder relationships, networking, leadership, growth, sales,
partnerships, founder loneliness, decision making, co-founders, hiring, team building,
personal growth, business growth, community, referrals, friendships, founder
psychology, environment/who-you-surround-yourself-with, collective intelligence,
founder experiences, human connection.

Voice: direct, a little contrarian, conversational, no corporate-speak, no emojis, no
hashtags in the on-screen copy. Every reel needs ONE sharp insight or reframe - not a
generic listicle.

Every reel plays for exactly 10 seconds, so on-screen copy must be scannable:
- hook: one punchy line, fits a headline panel (aim for 6-12 words, max ~90 characters)
- context: one short sentence that sets up the numbered points and teases which point
  matters most (aim for 15-25 words)
- points: 3 to 4 concise numbered points (each roughly 12-25 words) that deliver on the
  hook - concrete, specific, not vague platitudes
- caption: a longer Instagram caption (100-180 words) that expands on the reel with a
  short opening thought + useful expansion + community connection + CTA line. Do not
  just restate the on-screen text verbatim.
- cta: either DM "TRIBE" to be part of the community (general) or DM "DINNER" to attend
  the next Founders Networking Dinner (only when the content is specifically about an
  in-person event/dinner) - default to TRIBE unless the concept clearly calls for DINNER

Never shrink the idea to fit - if a concept needs more than 4 points, cut it down to
the strongest 3-4, don't cram.`;

function buildUserPrompt(count, existingTopics) {
  const avoidList = existingTopics.length
    ? `Already published or queued topics/hooks to avoid repeating or rewording (do NOT submit anything that communicates essentially the same message as any of these, even with different words):\n${existingTopics.map((t) => `- ${t}`).join("\n")}\n\n`
    : "";
  return `${avoidList}Generate exactly ${count} completely new, distinct TCC Founders Club reel concepts. Each must have a genuinely different angle/topic from each other and from the avoid-list above.

Respond with ONLY a raw JSON array (no markdown fences, no prose before or after), where each element has exactly this shape:
{
  "topic": "short internal label for the angle",
  "hook": "...",
  "context": "...",
  "points": ["...", "...", "..."],
  "caption": "...",
  "cta": "DM \\"TRIBE\\"" or "DM \\"DINNER\\""
}`;
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function validateConcept(c) {
  if (!c || typeof c !== "object") return "not an object";
  if (typeof c.topic !== "string" || !c.topic.trim()) return "missing topic";
  if (typeof c.hook !== "string" || !c.hook.trim()) return "missing hook";
  if (typeof c.context !== "string" || !c.context.trim()) return "missing context";
  if (!Array.isArray(c.points) || c.points.length < 3 || c.points.length > 4) return "points must be an array of 3-4";
  if (c.points.some((p) => typeof p !== "string" || !p.trim())) return "empty point";
  if (typeof c.caption !== "string" || c.caption.trim().length < 40) return "caption too short";
  if (typeof c.cta !== "string" || !/DM\s+"(TRIBE|DINNER)"/i.test(c.cta)) return "invalid cta";
  return null;
}

// Calls the Anthropic API to generate `count` fresh reel concepts in one
// batch (cheaper than one call per concept). Retries a small, bounded
// number of times on transient failure; never loops forever or silently
// burns API credits.
export async function generateConcepts(count, existingTopics, { maxAttempts = 2 } = {}) {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildUserPrompt(count, existingTopics) }],
        }),
      });
      if (!resp.ok) {
        throw new Error(`Anthropic API error: ${resp.status} ${await resp.text()}`);
      }
      const data = await resp.json();
      const text = data.content?.map((b) => b.text || "").join("") || "";
      const jsonText = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error("Response was not a JSON array");

      const valid = [];
      for (const concept of parsed) {
        const err = validateConcept(concept);
        if (err) {
          console.warn(`Discarding malformed concept (${err}):`, JSON.stringify(concept).slice(0, 200));
          continue;
        }
        valid.push(concept);
      }
      if (valid.length === 0) throw new Error("No valid concepts survived validation");
      return valid;
    } catch (err) {
      lastError = err;
      console.warn(`generateConcepts attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
    }
  }
  throw lastError;
}

export function contentFingerprint(concept) {
  return [normalize(concept.hook), normalize(concept.context), ...concept.points.map(normalize)].join("|");
}
