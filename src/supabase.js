import fs from "node:fs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const BUCKET = "content";

// Uploads a local file to the public "content" bucket and returns its public URL.
export async function uploadToSupabase(localPath, remoteFileName, contentType) {
  const body = fs.readFileSync(localPath);
  const resp = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${remoteFileName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        apikey: SUPABASE_SECRET_KEY,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body,
    }
  );
  if (!resp.ok) {
    throw new Error(`Supabase upload failed: ${resp.status} ${await resp.text()}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${remoteFileName}`;
}
