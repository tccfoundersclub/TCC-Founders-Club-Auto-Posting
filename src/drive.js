import fs from "node:fs";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

async function driveFetch(path, token, options = {}) {
  const resp = await fetch(`${DRIVE_API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
  if (!resp.ok) {
    throw new Error(`Drive API ${path} failed: ${resp.status} ${await resp.text()}`);
  }
  return resp;
}

async function findOrCreatePostedFolder(token) {
  const q = encodeURIComponent(
    `'${FOLDER_ID}' in parents and name='Posted' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const listResp = await driveFetch(`/files?q=${q}&fields=files(id,name)`, token);
  const { files } = await listResp.json();
  if (files.length > 0) return files[0].id;

  const createResp = await driveFetch("/files", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Posted",
      mimeType: "application/vnd.google-apps.folder",
      parents: [FOLDER_ID],
    }),
  });
  const created = await createResp.json();
  return created.id;
}

// Returns the oldest unposted image/video in the inbox folder, or null.
export async function pickNextFile(token) {
  const q = encodeURIComponent(
    `'${FOLDER_ID}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`
  );
  const resp = await driveFetch(
    `/files?q=${q}&fields=files(id,name,mimeType,createdTime)&orderBy=createdTime`,
    token
  );
  const { files } = await resp.json();
  return files.length > 0 ? files[0] : null;
}

export async function downloadFile(fileId, token, destPath) {
  const resp = await driveFetch(`/files/${fileId}?alt=media`, token);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return destPath;
}

// Returns a random audio track from the "Music" subfolder (if one exists and
// has files in it), or null if no music library has been set up yet.
export async function pickMusicTrack(token) {
  const folderQ = encodeURIComponent(
    `'${FOLDER_ID}' in parents and name='Music' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const folderResp = await driveFetch(`/files?q=${folderQ}&fields=files(id)`, token);
  const { files: folders } = await folderResp.json();
  if (folders.length === 0) return null;

  const musicFolderId = folders[0].id;
  const fileQ = encodeURIComponent(
    `'${musicFolderId}' in parents and trashed=false and mimeType contains 'audio/'`
  );
  const fileResp = await driveFetch(`/files?q=${fileQ}&fields=files(id,name)`, token);
  const { files: tracks } = await fileResp.json();
  if (tracks.length === 0) return null;

  return tracks[Math.floor(Math.random() * tracks.length)];
}

// Moves a file into the "Posted" subfolder so it's never picked again.
export async function markAsPosted(fileId, token) {
  const postedFolderId = await findOrCreatePostedFolder(token);
  await driveFetch(
    `/files/${fileId}?addParents=${postedFolderId}&removeParents=${FOLDER_ID}`,
    token,
    { method: "PATCH" }
  );
}
