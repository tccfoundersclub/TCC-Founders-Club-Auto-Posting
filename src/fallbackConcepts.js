// Small reserve bank used only when the live Anthropic call fails after its
// retry budget is exhausted, so the pipeline doesn't stop generating new
// reels entirely. Each entry still goes through the same duplicate checks
// as live-generated content, and is marked source:"fallback" once used so
// it is never reused. Add more here over time if the bank runs low.
export const FALLBACK_CONCEPTS = [
  {
    topic: "Founders avoid confronting a stalling co-founder relationship",
    hook: `The Co-Founder Conversation Most Founders Postpone for a Year`,
    context: `Everyone knows the relationship has drifted. Almost nobody schedules the conversation. Point 3 is why that's expensive.`,
    points: [
      `A co-founder mismatch rarely explodes. It erodes quietly while both people avoid the topic.`,
      `"We'll figure it out eventually" is usually code for "neither of us wants to go first."`,
      `The startups that survive a co-founder rift are the ones who had the hard conversation at month three, not month thirty.`,
      `Waiting doesn't make the conversation easier. It just makes the eventual split messier.`,
    ],
    caption: `Nobody puts "have an uncomfortable conversation with my co-founder" on the roadmap. So it never happens.

Most co-founder relationships don't end in one dramatic blowup. They end in a slow drift that both people can feel and neither names, until the gap is too wide to close.

The founders who keep their partnerships intact aren't the ones who never disagree. They're the ones who treat the hard conversation as routine maintenance, not a last resort.

If something's been unsaid in your founding team for months, that's the actual roadmap item.

DM "TRIBE" to find founders who'll tell you the truth about this.`,
    cta: `DM "TRIBE"`,
  },
  {
    topic: "Always-on founder culture quietly damages decision quality",
    hook: `Your Best Decisions Aren't Happening at 11PM`,
    context: `Founders wear exhaustion like a badge. Point 2 is what it's actually costing you.`,
    points: [
      `Being busy at midnight feels like commitment. It's usually just bad time management wearing a costume.`,
      `Decision quality drops long before you notice you're tired - you just stop noticing the drop.`,
      `The founders making the calmest, best calls aren't working less. They're protecting the hours when their judgment is sharp.`,
    ],
    caption: `"I'll just push through" is the most expensive sentence in startup life.

Exhaustion doesn't announce itself. You don't feel your judgment slipping - you just start making calls you'd never make well-rested, and you don't find out until later.

The founders who consistently make good decisions aren't superhuman. They've just noticed that willpower is a terrible substitute for actually being rested when it matters.

Protecting your sharpest hours isn't soft. It's the highest-leverage thing you can do for the business.

DM "TRIBE" to be around founders who take this seriously.`,
    cta: `DM "TRIBE"`,
  },
  {
    topic: "Reciprocity and generosity compound a founder's network over time",
    hook: `Why Some Founders' Networks Get Stronger Every Year (and Others Don't)`,
    context: `It's not who has more contacts. Point 2 is the actual difference.`,
    points: [
      `A contact list isn't a network. A network is people who'd actually pick up the phone for you.`,
      `The founders whose networks compound are the ones who help first and ask second, consistently, without keeping score.`,
      `Transactional networking gets you a reply. Generous networking gets you a call back two years later.`,
      `What you gave a room last year is usually a better predictor of this year's opportunities than what you're asking for now.`,
    ],
    caption: `Two founders can have the exact same number of contacts and completely different networks.

One treats every relationship like a transaction - what can this person do for me right now. The other shows up, helps before being asked, and doesn't keep score.

Five years in, the second founder has a network that compounds. People remember who showed up for them, and they return the favor without being asked.

Your network isn't the size of your contact list. It's the sum of what you've actually given the people in it.

DM "TRIBE" to build the kind of network that compounds.`,
    cta: `DM "TRIBE"`,
  },
  {
    topic: "Hiring people who think like you creates a blind-spot trap",
    hook: `The Hiring Mistake That Feels Like Good Judgment`,
    context: `Hiring people who "just get it" feels efficient. Point 3 is the hidden cost.`,
    points: [
      `Hiring people who think like you feels efficient because there's no friction. That's exactly the problem.`,
      `A team that agrees quickly isn't a team that's right. It's a team with one blind spot, repeated five times.`,
      `The best early hires aren't the easiest to talk to - they're the ones willing to tell you the plan has a hole in it.`,
    ],
    caption: `"They just get it" is one of the most dangerous compliments in hiring.

When someone thinks exactly like you, conversations feel effortless. Decisions move fast. It feels like you've found the right person.

What it usually means is you've hired your own blind spot and given it a seat at the table. Nobody's there to catch what you're missing, because nobody's looking from a different angle.

The hires that actually protect a company aren't the ones who agree fastest. They're the ones who see what you don't.

DM "TRIBE" to think this through with founders who've made both mistakes.`,
    cta: `DM "TRIBE"`,
  },
  {
    topic: "Environment does more work than willpower for founder discipline",
    hook: `Discipline Is Mostly a Myth. Environment Isn't.`,
    context: `Founders love to talk about discipline. Point 2 is what actually predicts consistency.`,
    points: [
      `Willpower is a limited resource that runs out by 3pm. Environment doesn't get tired.`,
      `The founders who stay consistent didn't get more disciplined - they got better at designing rooms that make the right choice the easy one.`,
      `Who you're around, where you work, and what's normal in your circle will beat willpower every single time.`,
    ],
    caption: `Nobody wins the discipline game through pure willpower. The founders who look disciplined have usually just stopped relying on it.

Willpower runs out. It's a battery, not a personality trait. By the afternoon, most people are running on fumes, no matter how motivated they were at 7am.

What actually holds up is environment - the room you work in, the people you're around, what's considered normal in your circle. Change the environment and the "discipline" takes care of itself.

If you're relying on motivation alone, you're playing the hardest version of this game.

DM "TRIBE" to build an environment that does some of the work for you.`,
    cta: `DM "TRIBE"`,
  },
  {
    topic: "The isolation that hits right after a founder's big win",
    hook: `The Loneliest Moment in a Founder's Year Is Usually Right After a Win`,
    context: `Everyone prepares founders for the hard months. Point 3 is the one nobody warns you about.`,
    points: [
      `Right after a raise or a big launch, the congratulations flood in for about a week.`,
      `Then everyone goes back to their own thing, and you're alone with a much bigger, much scarier version of the same job.`,
      `Nobody warns founders that success creates its own kind of isolation - fewer people who understand what the new pressure actually feels like.`,
      `The founders who handle the "after" well already had people around who'd stick past the congratulations message.`,
    ],
    caption: `Everyone prepares you for the hard months before a win. Almost nobody prepares you for the strange quiet right after one.

The messages come in for about a week. Then they stop, and you're left holding a bigger version of the same job, with higher stakes and fewer people who actually understand what changed.

That gap is where a lot of founders quietly struggle, right when it looks from the outside like everything's going well.

Having a room that sticks around after the congratulations post is what actually gets you through the "after."

DM "TRIBE" to have people in your corner past the highlight reel.`,
    cta: `DM "TRIBE"`,
  },
  {
    topic: "Better questions produce better rooms than more networking",
    hook: `The Founders With the Best Networks Ask Better Questions, Not More Questions`,
    context: `Everyone's told to "network more." Point 2 is what actually moves the needle.`,
    points: [
      `"What do you do?" gets you a business card. It rarely gets you a relationship.`,
      `The founders with the strongest rooms ask questions that make people think, not just questions that fill silence.`,
      `One good question in a real conversation builds more trust than an hour of surface-level small talk.`,
    ],
    caption: `"Network more" is advice that sounds right and mostly doesn't work.

More conversations with the same shallow question - "so what do you do?" - just gets you more business cards you'll never look at again.

The founders with genuinely strong rooms aren't doing more small talk. They're asking questions that make the other person actually think, and that's what turns a five-minute chat into a real relationship.

Quality of question beats quantity of contact, every time.

DM "TRIBE" to be in rooms built for real conversation, not small talk.`,
    cta: `DM "TRIBE"`,
  },
  {
    topic: "Not having time to network is usually a prioritization problem",
    hook: `"I Don't Have Time to Network" Is Rarely About Time`,
    context: `Every founder says they're too busy for this. Point 2 is usually the real reason.`,
    points: [
      `Founders find time for whatever they've decided actually matters. Everything else becomes "no time."`,
      `"I don't have time to network" is often just "I haven't seen the ROI yet, so it's not a priority."`,
      `The founders who make time for the right room usually aren't less busy. They've just seen what one relationship, built early, can do three years later.`,
    ],
    caption: `"I don't have time to network" is one of the most common things founders say, and it's rarely actually about time.

You find time for whatever you've decided matters. Investor updates happen. Product ships. Payroll gets made. The things that feel non-negotiable always get the hours.

Networking gets deprioritized because the payoff is invisible up front. Nobody sees the three-years-later moment when one relationship changes everything, so it never feels urgent.

The founders who show up anyway aren't less busy. They've just seen the payoff once, and it changed what they consider a priority.

DM "TRIBE" to make room for the relationships that pay off later.`,
    cta: `DM "TRIBE"`,
  },
];
