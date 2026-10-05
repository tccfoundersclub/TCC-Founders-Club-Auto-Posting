import test from "node:test";
import assert from "node:assert/strict";
import { publishDue } from "../src/reelPipeline.js";
import { isMetaAccessBlockedError, ensureMetaState, waitingReels, META_HOLD_STATUS } from "../src/metaAccess.js";

const BLOCKED_MSG = 'https://graph.instagram.com/v21.0/1784/media: 400 {"error":{"message":"API access blocked.","type":"OAuthException","code":200,"fbtrace_id":"x"}}';
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
const hoursAhead = (h) => new Date(Date.now() + h * 3600000).toISOString();

function reel(n, scheduledTime, status = "SCHEDULED") {
  return { reelId: `r${n}`, conceptId: `TCCFC-${n}`, hook: `hook ${n}`, caption: `A clean caption ${n}\n\n#TCCFoundersClub`, mediaUrl: `https://x/${n}.mp4`, cta: 'DM "TRIBE"', points: ["p"], scheduledTime, status, instagramResult: null, contentHash: `h${n}`, musicUsed: "m.mp3" };
}
const makeState = (reels) => ({ reels, contentBank: [], lastScheduledTime: reels.at(-1)?.scheduledTime });
function fakeApi({ igError, checkResult } = {}) {
  const calls = { ig: 0, threads: 0, check: 0 };
  return {
    calls,
    postToInstagram: async () => { calls.ig++; if (igError) throw new Error(igError); return { url: "https://www.instagram.com/reel/ABC/", mediaId: "123", attributionCommentPosted: null }; },
    postToThreads: async () => { calls.threads++; return { url: "u", postId: "p" }; },
    checkMetaAccess: async () => { calls.check++; return checkResult; },
  };
}
const log = () => {};

test("detects the real blocked error, not other errors", () => {
  assert.equal(isMetaAccessBlockedError(new Error(BLOCKED_MSG)), true);
  assert.equal(isMetaAccessBlockedError(new Error('400 {"error":{"message":"Invalid token","code":190}}')), false);
  assert.equal(isMetaAccessBlockedError(new Error("500 server error")), false);
});

test("blocked error holds all due reels (no FAILED), enters BLOCKED, stops calling the API", async () => {
  const state = makeState([reel(1, hoursAgo(5)), reel(2, hoursAgo(1)), reel(3, hoursAhead(3))]);
  const api = fakeApi({ igError: BLOCKED_MSG });
  await publishDue(state, log, api);
  assert.equal(api.calls.ig, 1);
  assert.equal(state.metaAccess.status, "BLOCKED");
  assert.ok(state.metaAccess.blockedSince);
  assert.deepEqual(state.reels.map((r) => r.status), [META_HOLD_STATUS, META_HOLD_STATUS, "SCHEDULED"]);
  assert.equal(state.reels.filter((r) => r.status === "FAILED").length, 0);
  assert.equal(state.reels[0].originalScheduledTime, state.reels[0].scheduledTime);
  assert.equal(state.reels[0].mediaUrl, "https://x/1.mp4");
});

test("while BLOCKED and still blocked: only the read-only check runs, nothing is published, due reels held", async () => {
  const state = makeState([reel(1, hoursAgo(1))]);
  ensureMetaState(state).status = "BLOCKED";
  const api = fakeApi({ checkResult: { ok: false, blocked: true, error: BLOCKED_MSG } });
  await publishDue(state, log, api);
  assert.equal(api.calls.check, 1);
  assert.equal(api.calls.ig, 0);
  assert.equal(state.reels[0].status, META_HOLD_STATUS);
  assert.equal(state.metaAccess.status, "BLOCKED");
  assert.ok(state.metaAccess.nextCheck);
});

test("recovery re-slots held reels every 4h in original order, publishes nothing now, keeps history", async () => {
  const state = makeState([reel(1, hoursAgo(9)), reel(2, hoursAgo(5)), reel(3, hoursAhead(2)), reel(4, hoursAhead(6))]);
  state.reels[0].status = META_HOLD_STATUS; state.reels[1].status = META_HOLD_STATUS;
  ensureMetaState(state).status = "BLOCKED";
  const api = fakeApi({ checkResult: { ok: true, proof: { username: "u", userIdMatches: true } } });
  await publishDue(state, log, api);
  assert.equal(api.calls.ig, 0, "no burst publish on recovery");
  assert.equal(state.metaAccess.status, "HEALTHY");
  assert.ok(state.metaAccess.recoveryProof.userIdMatches);
  assert.equal(waitingReels(state).length, 0);
  const times = state.reels.map((r) => new Date(r.scheduledTime).getTime());
  for (let i = 1; i < times.length; i++) assert.equal(times[i] - times[i - 1], 4 * 3600000);
  assert.ok(times[0] > Date.now());
  assert.ok(state.reels.every((r) => r.status === "SCHEDULED"));
  assert.equal(state.reels[0].recoveryStatus, "RESCHEDULED");
  assert.ok(state.reels[0].originalScheduledTime && state.reels[0].scheduleHistory.length === 1);
  assert.equal(state.lastScheduledTime, state.reels[3].scheduledTime);
});

test("non-blocked publish errors keep the existing FAILED behavior", async () => {
  const state = makeState([reel(1, hoursAgo(1))]);
  const api = fakeApi({ igError: "500 something else" });
  await publishDue(state, log, api);
  assert.equal(state.reels[0].status, "FAILED");
  assert.equal(state.metaAccess.status, "HEALTHY");
});

test("healthy publish still works and Threads failure cannot affect Instagram", async () => {
  const state = makeState([reel(1, hoursAgo(1))]);
  const api = fakeApi();
  api.postToThreads = async () => { throw new Error("threads blocked"); };
  await publishDue(state, log, api);
  assert.equal(state.reels[0].status, "PUBLISHED");
  assert.equal(state.reels[0].threadsStatus, "THREADS_FAILED");
});
