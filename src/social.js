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

export async function postToInstagram(mediaUrl, caption, isVideo) {
  const data = {
    caption,
    access_token: IG_ACCESS_TOKEN,
    ...(isVideo ? { media_type: "REELS", video_url: mediaUrl } : { image_url: mediaUrl }),
  };
  const create = await postForm(`${IG_GRAPH}/${IG_USER_ID}/media`, data);
  await sleep(isVideo ? 15000 : 2000); // video containers take longer to process
  const publish = await postForm(`${IG_GRAPH}/${IG_USER_ID}/media_publish`, {
    creation_id: create.id,
    access_token: IG_ACCESS_TOKEN,
  });
  return `https://www.instagram.com/p/${publish.id}/`;
}

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
  await sleep(isVideo ? 15000 : 2000);
  const publish = await postForm(`${THREADS_GRAPH}/${THREADS_USER_ID}/threads_publish`, {
    creation_id: create.id,
    access_token: THREADS_ACCESS_TOKEN,
  });
  return `https://www.threads.net/@tccfoundersclub/post/${publish.id}`;
}
