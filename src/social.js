import { isMetaAccessBlockedError } from "./metaAccess.js";
const GRAPH = "https://graph.facebook.com/v21.0";
const IG_GRAPH = "https://graph.instagram.com/v21.0";
const THREADS_GRAPH = "https://graph.threads.net/v1.0";

const IG_USER_ID = process.env.IG_USER_ID;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const THREADS_USER_ID = process.env.THREADS_USER_ID;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postForm(url, data) {
  const resp = await fetch(url, { method: "POST", body: new URLSearchParams(data) });
  const json = await resp.json();
  if (!resp.ok) throw new Error(`${url}: ${resp.status} ${JSON.stringify(json)}`);
  return json;
}

async function getJson(url, params) {
  const resp = await fetch(`${url}?${new URLSearchParams(params)}`);
  const json = await resp.json();
  if (!resp.ok) throw new Error(`${url}: ${resp.status} ${JSON.stringify(json)}`);
  return json;
}

// Video/reel containers process asynchronously server-side. Polling the
// container's own status is more reliable than a fixed sleep, especially for
// longer text-reels which can take well over the old flat 15s wait.
async function pollUntilReady(url, containerId, accessToken, statusField, readyValue, { timeoutMs = 120000, intervalMs = 4000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await getJson(`${url}/${containerId}`, { fields: statusField, access_token: accessToken });
    const value = status[statusField];
    if (value === readyValue) return;
    if (value === "ERROR" || value === "EXPIRED") {
      throw new Error(`Media container ${containerId} failed processing: ${JSON.stringify(status)}`);
    }
    await sleep(intervalMs);
  }
  throw new Error(`Media container ${containerId} did not finish processing within ${timeoutMs}ms`);
}

// commentText: required legal attribution (e.g. a CC-BY music credit) goes
// here instead of in the caption - posted as the first comment right after
// publish, which satisfies CC BY / CC BY-SA "reasonably associated with the
// work" attribution requirements without putting production metadata in
// front of the audience. A failed comment does NOT fail the publish itself
// (the reel is already live either way); the caller decides how to record
// that the attribution comment didn't go through.
export async function postToInstagram(mediaUrl, caption, isVideo, thumbOffsetMs, commentText) {
  const data = {
    caption,
    access_token: IG_ACCESS_TOKEN,
    ...(isVideo ? { media_type: "REELS", video_url: mediaUrl } : { image_url: mediaUrl }),
    ...(isVideo && thumbOffsetMs != null ? { thumb_offset: thumbOffsetMs } : {}),
  };
  const create = await postForm(`${IG_GRAPH}/${IG_USER_ID}/media`, data);
  if (isVideo) {
    await pollUntilReady(IG_GRAPH, create.id, IG_ACCESS_TOKEN, "status_code", "FINISHED");
  } else {
    await sleep(2000);
  }
  const publish = await postForm(`${IG_GRAPH}/${IG_USER_ID}/media_publish`, {
    creation_id: create.id,
    access_token: IG_ACCESS_TOKEN,
  });

  let attributionCommentPosted = false;
  if (commentText) {
    try {
      await postForm(`${IG_GRAPH}/${publish.id}/comments`, {
        message: commentText,
        access_token: IG_ACCESS_TOKEN,
      });
      attributionCommentPosted = true;
    } catch (e) {
      // Non-fatal: the reel is already live. Caller records this so it's
      // visible, not silently dropped.
      console.warn(`Attribution comment failed for media ${publish.id}: ${e.message}`);
    }
  }

  return { url: `https://www.instagram.com/p/${publish.id}/`, mediaId: publish.id, attributionCommentPosted };
}

// Facebook publishing: DISABLED BY USER REQUEST (2026-09-30). Instagram is
// the primary platform and Threads the secondary one; Facebook is no longer
// called from the production path (see publishDue() in reelPipeline.js).
// This function is left in place, isolated and unused, rather than deleted,
// in case Facebook is ever re-enabled later.
export async function postToFacebookPage(mediaUrl, caption, isVideo) {
  const result = isVideo
    ? await postForm(`${GRAPH}/${FB_PAGE_ID}/videos`, {
        file_url: mediaUrl,
        description: caption,
        access_token: FB_PAGE_ACCESS_TOKEN,
      })
    : await postForm(`${GRAPH}/${FB_PAGE_ID}/photos`, {
        url: mediaUrl,
        caption,
        access_token: FB_PAGE_ACCESS_TOKEN,
      });
  const postId = result.post_id || result.id;
  return `https://www.facebook.com/${postId}`;
}

export async function postToThreads(caption, mediaUrl, isVideo) {
  const data = { access_token: THREADS_ACCESS_TOKEN, text: caption };
  if (mediaUrl) {
    data.media_type = isVideo ? "VIDEO" : "IMAGE";
    if (isVideo) data.video_url = mediaUrl;
    else data.image_url = mediaUrl;
  } else {
    data.media_type = "TEXT";
  }
  const create = await postForm(`${THREADS_GRAPH}/${THREADS_USER_ID}/threads`, data);
  if (isVideo) {
    await pollUntilReady(THREADS_GRAPH, create.id, THREADS_ACCESS_TOKEN, "status", "FINISHED");
  } else {
    await sleep(2000);
  }
  const publish = await postForm(`${THREADS_GRAPH}/${THREADS_USER_ID}/threads_publish`, {
    creation_id: create.id,
    access_token: THREADS_ACCESS_TOKEN,
  });
  return { url: `https://www.threads.net/@tccfoundersclub/post/${publish.id}`, postId: publish.id };
}

// Lightweight, read-only Instagram access check used while the pipeline is in
// META_ACCESS_BLOCKED safe mode. Reads the account identity and the
// publishing-quota endpoint only: no media is created, no quota is spent.
// Resolves (never throws) to { ok, blocked, error, proof }.
export async function checkMetaAccess() {
  try {
    const me = await getJson(`${IG_GRAPH}/me`, { fields: "user_id,username,account_type", access_token: IG_ACCESS_TOKEN });
    const idMatches = [me.user_id, me.id].some((v) => v != null && String(v) === String(IG_USER_ID));
    if (!idMatches) {
      return { ok: false, blocked: false, error: "Authenticated Instagram user does not match IG_USER_ID" };
    }
    const quota = await getJson(`${IG_GRAPH}/${IG_USER_ID}/content_publishing_limit`, {
      fields: "quota_usage,config",
      access_token: IG_ACCESS_TOKEN,
    });
    return { ok: true, blocked: false, error: null, proof: { username: me.username, accountType: me.account_type, userIdMatches: true, quota: quota.data?.[0] || quota } };
  } catch (e) {
    return { ok: false, blocked: isMetaAccessBlockedError(e), error: e.message };
  }
}
