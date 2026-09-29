// Caption + Reel-beat bank for The Connector Club / TCC Founders Club, built
// from the full brand framework: founder-to-founder tone, no selling, no
// corporate language, hook -> short paragraphs -> human insight -> community
// CTA. Required CTA (verbatim, every post): DM "COMMUNITY".
//
// Audience philosophy (explicit, from the brand's own framework):
// RELEVANCE > VIRALITY. QUALITY > QUANTITY. CONNECTION > IMPRESSIONS.
// This is optimizing for the right founders recognizing themselves, not
// for mass reach. Never promise status, luxury, or exclusivity - let
// specificity and substance do the filtering.
//
// `beats` follows the "Silent Film Storytelling Reel" format (no talking -
// music + B-roll + on-screen text carrying a mini story arc): a hook in the
// first ~3.5s, a tension/insight beat mid-clip, and the CTA reinforced on
// screen near the end. Used by compileReel() in media.js for video posts.
// Static image posts (compileImage) keep running in the same rotation -
// beats are simply unused for those.
//
// Pillars covered: founder pain, founder psychology ("the founder mask"),
// scaling reality, humanized networking, community/belonging, founder humor,
// Pakistani/Islamabad founder reality. Rotates by seed so consecutive runs
// don't repeat the same pillar back to back.

const CTA = `If you want to be part of the community we're building, DM "COMMUNITY".`;
const ON_SCREEN_CTA = `DM "COMMUNITY"`;

function beats(hook, tension) {
  return [
    { text: hook, start: 0, end: 3.5 },
    { text: tension, start: 20, end: 24.5 },
    { text: ON_SCREEN_CTA, start: 52, end: 58 },
  ];
}

// Three-part beat set for a 10-second clip-based reel: hook, then a short
// body/description line, then the CTA held at the end - the same hook +
// tension pair each theme already carries (see beats() above), just
// compressed to fit a 10-second clip instead of a 58-second one.
export function shortBeats(hook, body) {
  return sceneBeats(hook, body, 10);
}

// Same three-part hook/body/CTA structure as shortBeats, but proportional to
// whatever total duration the clip actually ends up being (multi-clip edits
// vary in length: 5-20s depending on how many segments are blended in).
export function sceneBeats(hook, body, totalDuration) {
  const gap = Math.min(0.3, totalDuration * 0.03);
  const hookEnd = totalDuration * 0.32;
  const bodyEnd = totalDuration * 0.7;
  return [
    { text: hook, start: 0, end: hookEnd },
    { text: body, start: hookEnd + gap, end: bodyEnd },
    { text: ON_SCREEN_CTA, start: bodyEnd + gap, end: totalDuration },
  ];
}

const THEMES = [
  // Founder psychology / the founder mask
  {
    beats: beats("You can be growing\nand still feel completely lost.", "The 1am thoughts\ndon't make it to the caption."),
    instagram: `You can be growing every month and still feel like nobody actually knows what's going on.

Founders get good at answering "How's business?" with the clean version. Growth. New clients. A good month.

What doesn't come up as often — the 1am thoughts about whether it's sustainable. Making calls nobody else can make. Being the person everyone looks to for answers, even on the days you don't have one.

There's a version of the story only other founders would actually understand.

That's the gap we're trying to close.

${CTA}`,
    facebook: `You can be growing every month and still feel like nobody actually knows what's going on.

Founders get good at giving the clean update — growth, new clients, a good month. What doesn't come up as often is the 1am thoughts about whether it's sustainable, or being the person everyone looks to for answers on the days you don't have one.

We started this community because that part of the story deserves a room too.

${CTA}`,
    threads: `You can be growing every month and still feel like nobody actually knows what's going on. That's the part founders don't post about.

${CTA}`,
  },

  // Scaling reality
  {
    beats: beats("Growth means less control,\nnot more.", "Nobody prepares you\nfor that part."),
    instagram: `Going from 10 people to 50 doesn't just mean more hiring.

It means realizing you can no longer personally solve every problem — and sitting with how uncomfortable that actually feels.

Nobody prepares you for the part where growth means less control, not more.

${CTA}`,
    facebook: `Going from 10 employees to 50 isn't just an HR problem. It's the moment a founder realizes they can no longer personally solve every problem in the company — and has to figure out who they even talk to about that shift.

${CTA}`,
    threads: `The hardest part of scaling isn't hiring more people. It's losing the ability to personally fix everything.

${CTA}`,
  },

  // Humanized networking
  {
    beats: beats("Nobody needs another\nbusiness card exchange.", "The real ones happen\nwhen someone says 'same.'"),
    instagram: `Nobody needs another event where you stand up, say your name, and hand someone a business card.

What actually changes something is one real conversation — the kind where someone says the thing they've been sitting on, and another founder just says "same."

That's the room we're trying to build.

${CTA}`,
    facebook: `Most networking events are optimized for the wrong thing — cards exchanged, LinkedIn adds, a pitch nobody asked for. The conversations that actually change something look nothing like that.

${CTA}`,
    threads: `Less "here's my card," more "wait, you're dealing with that too?" That's the difference we're going for.

${CTA}`,
  },

  // Founder humor (grounded, not cringe)
  {
    beats: beats("\"How's business?\"\nhas two answers.", "The public one.\nAnd the true one."),
    instagram: `"How's business?" — the only question with a public answer and a private one, and they're never the same.

If you've ever answered that question in an elevator while actively doing damage control in your head, this one's for you.

${CTA}`,
    facebook: `There should be a support group for founders who've said "yeah, going great" while mentally rewriting their entire hiring plan in real time.

${CTA}`,
    threads: `"How's business?" has a public answer and a private answer and they have never once matched.

${CTA}`,
  },

  // Pakistani / Islamabad founder reality
  {
    beats: beats("Building in Pakistan\nis its own kind of pressure.", "Family expectations.\nCurrency swings. Proving it."),
    instagram: `Building a company in Pakistan comes with a version of pressure most founder content doesn't touch — family expectations, currency swings, proving a "risky" choice was the right one.

And still, some of the most resilient, technically sharp, globally ambitious founders we know are building right here.

That combination deserves a room of its own.

${CTA}`,
    facebook: `Founders building from Pakistan carry a specific kind of pressure — family expectations, currency instability, selling into markets that don't fully understand the context they're building in. That reality deserves its own conversation, not a generic one.

${CTA}`,
    threads: `Building from Pakistan comes with a specific kind of pressure most founder content skips entirely.

${CTA}`,
  },

  // Community / belonging
  {
    beats: beats("The best thing that happened\nwasn't a client.", "It was someone saying\n'same' back."),
    instagram: `The best thing that's happened to some of the founders we know wasn't a client or a round of funding.

It was meeting someone at a dinner who said the exact thing they'd been afraid to say out loud — and hearing "same" back.

${CTA}`,
    facebook: `Sometimes the most valuable outcome of a room full of founders isn't a deal. It's realizing you're not the only one dealing with what you're dealing with.

${CTA}`,
    threads: `Sometimes the best thing that happens in a room isn't a deal. It's someone saying "same."

${CTA}`,
  },

  // Founder pain: cash flow
  {
    beats: beats("The revenue looks fine.\nThe cash flow does not.", "Payroll doesn't care\nthat next month looks better."),
    instagram: `Revenue can look healthy on a slide and still leave you checking the account balance at midnight before payroll.

Nobody talks enough about the gap between "the business is doing well" and "the cash is actually there when it needs to be."

It's not a failure. It's just a part of building that rarely gets said out loud.

${CTA}`,
    facebook: `There's a gap between "the business is doing well" and "the cash is actually there when it needs to be" that doesn't show up on a pitch deck but shows up in every founder's actual week.

${CTA}`,
    threads: `Revenue can look fine and cash flow can still keep you up at night. Different problems, same slide.

${CTA}`,
  },

  // Founder pain: a bad hire
  {
    beats: beats("The wrong hire doesn't\nshow up in week one.", "It shows up three months in,\nquietly, everywhere."),
    instagram: `Every founder has a hire they knew was wrong within the first month — and kept anyway, hoping it would fix itself.

It rarely does. The cost isn't just the hire. It's the time, the team's trust, and the thing that didn't get built while you were managing around it.

If you've been there, you're not bad at hiring. You're a founder who's actually hired people.

${CTA}`,
    facebook: `A hire you knew was wrong in month one, kept anyway, and paid for slowly over the next six — most founders have a version of this story. It doesn't mean you're bad at hiring.

${CTA}`,
    threads: `The wrong hire rarely announces itself in week one. It shows up quietly, three months in.

${CTA}`,
  },

  // Founder lessons: delegation
  {
    beats: beats("You can't scale\nwhat only you can do.", "Letting go is the skill.\nNot doing more."),
    instagram: `The hardest lesson for a lot of founders isn't a strategy lesson. It's learning that the company can't grow past what only you personally know how to do.

Delegation isn't about trusting people less carefully. It's about building systems careful enough that you don't have to be in every room.

That's a completely different skill than the one that got you here.

${CTA}`,
    facebook: `A company can't outgrow what only the founder personally knows how to do. Learning to delegate isn't about lowering the bar — it's building systems careful enough that you don't have to be in every room.

${CTA}`,
    threads: `You can't scale what only you can do. Letting go is the actual skill, not doing more.

${CTA}`,
  },

  // Founder lessons: pricing
  {
    beats: beats("Undercharging doesn't\nbuy you loyalty.", "It buys you resentment,\neighteen months later."),
    instagram: `A lot of founders learn pricing the hard way — by undercharging early to win the client, then resenting the relationship a year and a half later.

The client didn't do anything wrong. The price was wrong from day one.

That's a lesson that's expensive to learn and cheap to hear from someone who's already paid for it.

${CTA}`,
    facebook: `Undercharging to win a client rarely buys loyalty. It usually just delays the resentment by about eighteen months. A lesson most founders learn the expensive way.

${CTA}`,
    threads: `Undercharging doesn't buy loyalty. It buys resentment, just later.

${CTA}`,
  },

  // Failure stories: built something nobody wanted
  {
    beats: beats("Nobody wanted\nwhat we built.", "Six months of work.\nZero market pull."),
    instagram: `One of the most common founder stories that never makes it to LinkedIn: building something for six months, launching it, and realizing nobody actually wanted it.

Not necessarily a bad idea. Just built without enough of the conversations that would have caught it earlier.

Failure like that isn't proof you shouldn't be building. It's proof you're actually building.

${CTA}`,
    facebook: `Building for six months and launching to silence is one of the most common founder stories — and one of the least talked about. It's not proof you shouldn't build. It's proof you did.

${CTA}`,
    threads: `Six months of work. Zero market pull. More founders have this story than post about it.

${CTA}`,
  },

  // Failure stories: partnership that fell apart
  {
    beats: beats("The partnership looked perfect\non paper.", "Paper isn't where\nbusiness happens."),
    instagram: `Some of the most painful founder lessons come from partnerships that made complete sense on paper and fell apart in practice — different risk tolerance, different definition of "done," expectations nobody wrote down.

It's rarely about bad people. It's about two people who never actually aligned on what they were building.

${CTA}`,
    facebook: `A partnership can make total sense on paper and still fall apart in practice — usually over expectations nobody actually wrote down. Rarely about bad people. Almost always about misalignment.

${CTA}`,
    threads: `The partnership looked perfect on paper. Paper isn't where business actually happens.

${CTA}`,
  },

  // Founder relationships: friendships that fade
  {
    beats: beats("Some friendships don't survive\nyou becoming a founder.", "Not because you changed.\nBecause the context did."),
    instagram: `Founders don't talk enough about the friendships that quietly fade once the business starts taking most of the bandwidth — not out of conflict, just different worlds moving at different speeds.

The right people don't disappear. But you do need people who understand why you're tired in a way that isn't really about hours worked.

${CTA}`,
    facebook: `Some friendships quietly fade once building a company takes most of your bandwidth — not from conflict, just different worlds at different speeds. That's part of why the right peer group matters.

${CTA}`,
    threads: `Some friendships don't survive you becoming a founder. Not because you changed — because the context did.

${CTA}`,
  },

  // Founder relationships: co-founder trust
  {
    beats: beats("Trust is the real\nco-founder agreement.", "Not the equity split.\nThe trust."),
    instagram: `The equity split gets all the attention in co-founder conversations. The thing that actually determines whether it works is whether you trust each other enough to disagree without it becoming personal.

That's harder to negotiate and far more important.

${CTA}`,
    facebook: `The equity split gets the attention. Trust — the ability to disagree without it becoming personal — is what actually determines whether a co-founder relationship survives.

${CTA}`,
    threads: `Trust is the real co-founder agreement. Not the equity split. The trust.

${CTA}`,
  },

  // Collaboration: unplanned partnerships
  {
    beats: beats("The best partnerships\nweren't planned.", "They started as\n'wait, we should talk.'"),
    instagram: `Some of the most valuable business relationships founders have didn't start as a pitch. They started as a casual conversation that turned into "wait, we should actually work together."

That only happens when you're in rooms where those conversations can happen at all.

${CTA}`,
    facebook: `The most valuable partnerships rarely start as a pitch. They start as a casual conversation that turns into "wait, we should actually work together" — and that only happens in the right rooms.

${CTA}`,
    threads: `The best partnerships weren't planned. They started as "wait, we should talk."

${CTA}`,
  },

  // Founder lifestyle: beyond the metrics
  {
    beats: beats("Your company isn't the\nonly thing you're building.", "Health. Relationships.\nWho you're becoming."),
    instagram: `It's easy to measure a founder's life entirely in MRR, headcount, and growth percentages. Those numbers matter. They're also not the whole story.

Who you're becoming while you build this — as a partner, a friend, a person people can rely on — is part of the build too, even if it never makes it onto a slide.

${CTA}`,
    facebook: `MRR and headcount matter, but they're not the whole story. Who a founder becomes while building — as a partner, a friend, someone people can rely on — is part of the build too.

${CTA}`,
    threads: `Your company isn't the only thing you're building. Who you're becoming counts too.

${CTA}`,
  },

  // Women-focused
  {
    beats: beats("Ambitious women get asked\nto prove it twice.", "Once for the result.\nOnce for wanting it."),
    instagram: `Being ambitious as a woman often comes with a conversation nobody else has to have — proving the result, and then separately justifying wanting it in the first place.

The founders who've been through that understand something about persistence that doesn't always make it into the highlight reel.

${CTA}`,
    facebook: `Ambitious women often face a conversation their peers don't — proving the result, then separately justifying wanting it at all. That's a specific kind of persistence worth recognizing.

${CTA}`,
    threads: `Ambitious women get asked to prove it twice. Once for the result. Once for wanting it.

${CTA}`,
  },

  // Culture: your environment shapes you
  {
    beats: beats("You are not only\nyour intentions.", "You're also\nyour surroundings."),
    instagram: `A person can have real ambition and still struggle to execute — not because the ambition isn't there, but because the environment around them isn't built to support it.

Your surroundings quietly shape what you believe is possible, what you attempt, and what you tolerate.

That's most of why the room matters as much as the plan.

${CTA}`,
    facebook: `Ambition alone doesn't guarantee execution. Environment does a lot of the quiet work — shaping what you believe is possible and what you tolerate. That's why the room matters as much as the plan.

${CTA}`,
    threads: `You're not only your intentions. You're also your surroundings.

${CTA}`,
  },

  // Culture: serendipity
  {
    beats: beats("You never know\nwho you're about to meet.", "Or what that meeting\nquietly changes."),
    instagram: `You can't engineer the exact moment a conversation changes your thinking, or a stranger becomes a co-founder, or an offhand comment at dinner becomes the idea you build for the next two years.

But you can put yourself in more rooms where it's possible. That's the whole philosophy.

${CTA}`,
    facebook: `You can't engineer the exact moment that changes things — a conversation, a stranger, an offhand comment at dinner. You can only put yourself in more rooms where it's possible.

${CTA}`,
    threads: `You never know who you're about to meet, or what that meeting quietly changes.

${CTA}`,
  },

  // Culture: hosting well / noticing people
  {
    beats: beats("A good host doesn't work\nthe room.", "They notice who's\nstanding alone."),
    instagram: `A good host doesn't work the room. They notice who's standing alone, ask the better question, and introduce two people who should actually know each other.

That's not about expensive venues. It's about attention — and it's the whole difference between an event and a room people remember.

${CTA}`,
    facebook: `Hosting well isn't about the venue. It's about noticing who's standing alone, asking a better question, and introducing two people who should know each other. That's the difference people actually remember.

${CTA}`,
    threads: `A good host doesn't work the room. They notice who's standing alone.

${CTA}`,
  },

  // Culture: collective energy / empowerment chain
  {
    beats: beats("Today you help someone.\nTomorrow, they help you.", "That chain\nis the whole community."),
    instagram: `Someone shares a resource. Someone else learns from it. Someone starts a company. Someone else joins. Someone needs a co-founder — someone else knows one.

None of that requires one person at the center. It just requires enough people willing to be a source of leverage for someone else.

That chain is the actual definition of community.

${CTA}`,
    facebook: `Community isn't one person helping everyone. It's a chain — someone helps you today, you help someone else tomorrow. That chain, repeated enough times, is what actually compounds.

${CTA}`,
    threads: `Today you help someone. Tomorrow they help you. That chain is the whole community.

${CTA}`,
  },

  // Culture: who are you becoming (reflection)
  {
    beats: beats("Who are you becoming\nwhile building this?", "Not just what\nyou're building."),
    instagram: `Most founder conversations start with "what are you building?" Fewer ask "who are you becoming while you build it?"

Better leader. Better friend. Better partner. Someone people can actually rely on. That's part of the build too, even if it never makes it onto a slide.

${CTA}`,
    facebook: `"What are you building?" gets asked constantly. "Who are you becoming while you build it?" almost never does — even though it might be the more important question.

${CTA}`,
    threads: `Who are you becoming while building this? Not just what you're building.

${CTA}`,
  },

  // Founder pain: team growth / losing personal touch
  {
    beats: beats("You used to know\neveryone's name.", "Now you don't know\nhalf the team."),
    instagram: `There's a specific moment founders remember — realizing they no longer know everyone on the team by name.

It's not a failure of leadership. It's just what growth actually costs. Nobody prepares you for grieving the version of the company where you knew everyone.

${CTA}`,
    facebook: `Every founder who's scaled past a certain size remembers the moment they realized they didn't know everyone on the team anymore. That's not a leadership failure — it's just what growth costs.

${CTA}`,
    threads: `You used to know everyone's name. Now you don't know half the team. Nobody warns you about that part.

${CTA}`,
  },
];

export function generateCaptions(seed = Date.now()) {
  const theme = THEMES[seed % THEMES.length];
  return theme;
}

// 30 reel concepts (hook + 2-line caption + CTA), all closing on DM "TRIBE" -
// this is the content library for the editorial-style video reels, distinct
// from the static-post THEMES bank above (which still closes on "COMMUNITY").
const REEL_CONCEPTS = [
  {
    tag: "The Room Changes Everything",
    hook: `Sometimes you don't need a new strategy. You need a new room.`,
    caption: `The people around you can change what you think is possible. One room, one conversation, one introduction can open a completely different path.`,
    cta: `DM "TRIBE" if you want to be part of this tribe and attend our next Founders Networking Dinner.`,
  },
  {
    tag: "You Never Know Who You'll Meet",
    hook: `The person sitting next to you could change your life.`,
    caption: `You never know who you're going to meet, or what one conversation might unlock. A founder, partner, friend, mentor, client, or simply someone who understands you.`,
    cta: `DM "TRIBE" to be part of the community and join our next Founders Networking Dinner.`,
  },
  {
    tag: "Founders Need Friends Too",
    hook: `You built a company. But who do you talk to when things get hard?`,
    caption: `Founders don't always need another business contact. Sometimes they need people who genuinely understand the journey. The right community gives you people you can talk to without explaining everything.`,
    cta: `DM "TRIBE" to be part of it and attend our next Founders Networking Dinner.`,
  },
  {
    tag: `Networking Isn't About Business Cards`,
    hook: `If your networking event feels like a job interview, something is wrong.`,
    caption: `Real networking isn't collecting 50 contacts in one night. It's sitting across from someone interesting and having a conversation you actually remember.`,
    cta: `DM "TRIBE" if you want to experience our next Founders Networking Dinner.`,
  },
  {
    tag: "Your Next Co-Founder Might Be Somewhere in the Room",
    hook: `You might not need another idea. You might need another person.`,
    caption: `Some ideas become real when the right people finally meet. Your next co-founder, collaborator, partner, or teammate could be one conversation away.`,
    cta: `DM "TRIBE" to join the community and attend our next Founders Networking Dinner.`,
  },
  {
    tag: "The Founder Nobody Sees",
    hook: `Everyone sees the CEO. Almost nobody sees the person.`,
    caption: `Behind the revenue, team, clients and milestones is a human being figuring things out too. Sometimes the best conversations happen when founders stop performing success.`,
    cta: `DM "TRIBE" to find your people and join our next Founders Networking Dinner.`,
  },
  {
    tag: "The 10-Person Team Problem",
    hook: `Going from 10 people to 50 changes you more than you expect.`,
    caption: `At some point, you stop being able to solve everything yourself. Leadership becomes less about doing and more about understanding people.`,
    cta: `DM "TRIBE" to meet founders navigating the same journey at our next dinner.`,
  },
  {
    tag: "Successful But Lonely",
    hook: `You can be surrounded by 50 employees and still feel alone.`,
    caption: `Growth can increase responsibility faster than it increases understanding. That's why founders need people who understand the pressure behind the numbers.`,
    cta: `DM "TRIBE" to be part of the community and attend our next Founders Networking Dinner.`,
  },
  {
    tag: "The Conversation You Didn't Expect",
    hook: `You came for networking. You left with a completely different perspective.`,
    caption: `Sometimes the most valuable conversation isn't the one you planned to have. It's the random conversation that makes you rethink something important.`,
    cta: `DM "TRIBE" to experience the next Founders Networking Dinner.`,
  },
  {
    tag: "Stop Building Alone",
    hook: `Building alone feels productive until you realize how much you're missing.`,
    caption: `There are people around you who already know what you're trying to figure out. The challenge is finding them and actually starting the conversation.`,
    cta: `DM "TRIBE" to meet them at our next Founders Networking Dinner.`,
  },
  {
    tag: "The Right People Give You Energy",
    hook: `Ever spent two hours with someone and somehow left with more energy?`,
    caption: `That's what the right environment can do. Sometimes you don't need motivation. You need better energy around you.`,
    cta: `DM "TRIBE" to be part of this community and join our next dinner.`,
  },
  {
    tag: "Not Every Conversation Needs a Pitch",
    hook: `Imagine meeting someone without immediately asking what they can do for you.`,
    caption: `Talk about life. Ideas. Failure. Family. Dreams. Business. Anything. Sometimes the relationship becomes valuable precisely because it wasn't transactional.`,
    cta: `DM "TRIBE" to experience our next Founders Networking Dinner.`,
  },
  {
    tag: "The Founder Dinner",
    hook: `What if a founder dinner wasn't actually about networking?`,
    caption: `What if it was simply about sitting around a table with fascinating people and having real conversations? The opportunities can come naturally after the connection.`,
    cta: `DM "TRIBE" if you want to attend our next Founders Networking Dinner.`,
  },
  {
    tag: "Find People Outside Your Bubble",
    hook: `Your next big idea might come from someone in a completely different industry.`,
    caption: `Founders don't need more conversations with people exactly like them. Sometimes the best ideas come from designers, artists, marketers, creators and people outside your usual circle.`,
    cta: `DM "TRIBE" to join the community and meet them at our next dinner.`,
  },
  {
    tag: "Women Who Are Building",
    hook: `Ambitious women don't need another room where they're talked over.`,
    caption: `They need rooms where their ideas are heard, their work is respected and meaningful connections can happen naturally. We want more exceptional women building, creating and connecting with each other.`,
    cta: `DM "TRIBE" to be part of the community and attend our next Founders Networking Dinner.`,
  },
  {
    tag: "The Woman Behind the Founder",
    hook: `She isn't just someone's co-founder, employee, wife, daughter or sister. She's building too.`,
    caption: `Women are building companies, brands, creative careers and communities across Pakistan. Their stories deserve space, recognition and genuine connection.`,
    cta: `DM "TRIBE" to join a community where women and men can connect, collaborate and grow together.`,
  },
  {
    tag: "The Most Valuable Introduction",
    hook: `One introduction can be worth more than 100 cold DMs.`,
    caption: `Trust travels faster than a cold pitch. The right person introducing you to the right person can completely change the conversation.`,
    cta: `DM "TRIBE" to meet people worth knowing at our next Founders Networking Dinner.`,
  },
  {
    tag: "Your Network Has a Blind Spot",
    hook: `If everyone in your network thinks like you, you're missing something.`,
    caption: `Different industries create different perspectives. Sometimes the person who challenges your thinking is more valuable than the person who agrees with you.`,
    cta: `DM "TRIBE" to expand your circle at our next Founders Networking Dinner.`,
  },
  {
    tag: `The Person You Haven't Met Yet`,
    hook: `Your next opportunity doesn't have your name saved in their phone yet.`,
    caption: `They may not even know you exist. That's why you have to keep creating opportunities for meaningful people to cross paths.`,
    cta: `DM "TRIBE" to join the community and attend our next dinner.`,
  },
  {
    tag: "Founder Problems Nobody Posts",
    hook: `Nobody posts about the 2 AM decisions.`,
    caption: `People post the launch, the funding and the growth. The uncertainty, pressure and difficult decisions usually stay behind the scenes.`,
    cta: `DM "TRIBE" if you want conversations that go beyond the highlight reel.`,
  },
  {
    tag: "The Room You Become",
    hook: `Your environment doesn't just influence your business. It influences who you become.`,
    caption: `Spend enough time around builders and you start thinking differently about what's possible. Your surroundings can either reinforce your limits or challenge them.`,
    cta: `DM "TRIBE" to be part of the community and join our next Founders Networking Dinner.`,
  },
  {
    tag: `Not Everyone Wants Another LinkedIn Connection`,
    hook: `Maybe you don't need another connection. Maybe you need a friend.`,
    caption: `Someone you can call when you're stuck. Someone who understands the founder journey without needing a 20-minute explanation.`,
    cta: `DM "TRIBE" to find your people at our next Founders Networking Dinner.`,
  },
  {
    tag: "When Strangers Become Your People",
    hook: `They walked into the room as strangers.`,
    caption: `A few conversations later, they were exchanging ideas, stories, jokes and contacts. That's the beautiful part about bringing interesting people together.`,
    cta: `DM "TRIBE" to experience the next Founders Networking Dinner.`,
  },
  {
    tag: `You Don't Know What You Don't Know`,
    hook: `Someone around you already knows the answer you're searching for.`,
    caption: `The problem is you haven't met them yet. Community gives knowledge a human face.`,
    cta: `DM "TRIBE" to meet more people who can expand your world.`,
  },
  {
    tag: "The Founder Who Needed Perspective",
    hook: `Sometimes you don't need advice. You need perspective.`,
    caption: `Another founder can understand a problem differently because they've already lived through something similar. One conversation can save you months of figuring it out alone.`,
    cta: `DM "TRIBE" to join our community and attend our next Founders Networking Dinner.`,
  },
  {
    tag: "Build Your Tribe Before You Need Them",
    hook: `Don't wait until you're struggling to realize you have nobody to call.`,
    caption: `Build relationships before you need favors. The strongest networks are built through genuine connection, not emergency networking.`,
    cta: `DM "TRIBE" to meet your people at our next Founders Networking Dinner.`,
  },
  {
    tag: "The Creative + Founder Connection",
    hook: `A founder and an artist walk into a dinner…`,
    caption: `Different worlds can create unexpected ideas when they meet. The best communities don't just connect similar people. They create collisions between different perspectives.`,
    cta: `DM "TRIBE" to experience the next Founders Networking Dinner.`,
  },
  {
    tag: "What If Everyone Helped Someone?",
    hook: `Imagine a community where everyone came to contribute.`,
    caption: `You help someone today. Someone else helps you tomorrow. That's how relationships become an ecosystem instead of a transaction.`,
    cta: `DM "TRIBE" to be part of the community we're building.`,
  },
  {
    tag: `The Dinner You'll Remember`,
    hook: `You won't remember every networking event you attended.`,
    caption: `But you'll remember the one where you met someone who changed how you thought, built, or lived. That's the kind of experience we're trying to create.`,
    cta: `DM "TRIBE" to attend our next Founders Networking Dinner.`,
  },
  {
    tag: "Find Your People",
    hook: `Maybe you don't need more followers. Maybe you need your people.`,
    caption: `People who understand what you're building. People you can laugh with, learn from and build alongside. Because sometimes the biggest growth starts with simply finding the right room.`,
    cta: `DM "TRIBE" to become part of the community and attend our next Founders Networking Dinner.`,
  },
];

export function reelConcept(seed = Date.now()) {
  return REEL_CONCEPTS[seed % REEL_CONCEPTS.length];
}

export const REEL_CONCEPTS_COUNT = REEL_CONCEPTS.length;
