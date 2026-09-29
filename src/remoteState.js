import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const BUCKET = "content";
const STATE_KEY = "state/reel-pipeline-state.json";

const DEFAULT_STATE = {
  version: 0,
  reels: [],
  contentBank: [], // pre-written concepts, zero API cost - see src/fallbackConcepts.js / scripts/add-to-content-bank.js
  rejectedLog: [], // concepts that failed dedup, kept visible with a reason - see content-library/REJECTED.md
  nextConceptId: 1, // stable TCCFC-#### numbering, never reused even if a concept is later rejected/edited
  lastMusicPath: null,
  lastScheduledTime: null,
};

// Permanent, human-referenceable ID ("Change TCCFC-0147") - assigned once,
// on creation, and never reused or reassigned even if the concept is later
// rejected, edited, or its status changes.
export function assignConceptId(state) {
  const id = `TCCFC-${String(state.nextConceptId).padStart(4, "0")}`;
  state.nextConceptId += 1;
  return id;
}

// Persistent pipeline state (queue + full reel history + music rotation),
// stored as one JSON blob in the same Supabase Storage bucket already used
// for rendered video hosting. Survives across GitHub Actions runners since
// nothing is kept on any single machine's disk.
export async function loadState() {
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${STATE_KEY}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      apikey: SUPABASE_SECRET_KEY,
    },
  });
  if (!resp.ok) {
    const bodyText = await resp.text();
    // Supabase Storage returns HTTP 400 with a JSON body carrying its own
    // "404"/"not_found" statusCode for a missing object, not a real 404.
    if (resp.status === 404 || /"statusCode":\s*"404"|"error":\s*"not_found"/.test(bodyText)) {
      return { ...DEFAULT_STATE };
    }
    throw new Error(`Failed to load remote state: ${resp.status} ${bodyText}`);
  }
  const loaded = await resp.json();
  // Merge with defaults so fields added after a state file was first written
  // (e.g. contentBank) don't come back undefined for older saved states.
  return { ...DEFAULT_STATE, ...loaded };
}

export async function saveState(state) {
  state.version = (state.version || 0) + 1;
  const tmp = path.join(os.tmpdir(), `reel-state-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  const body = fs.readFileSync(tmp);
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${STATE_KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      apikey: SUPABASE_SECRET_KEY,
      "Content-Type": "application/json",
      "x-upsert": "true",
    },
    body,
  });
  fs.unlinkSync(tmp);
  if (!resp.ok) throw new Error(`Failed to save remote state: ${resp.status} ${await resp.text()}`);
  return state;
}

export function futureQueue(state, now = new Date()) {
  return state.reels
    .filter((r) => r.status === "SCHEDULED" && new Date(r.scheduledTime) > now)
    .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
}

export function dueReels(state, now = new Date()) {
  return state.reels
    .filter((r) => r.status === "SCHEDULED" && new Date(r.scheduledTime) <= now)
    .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
}

export function availableBankConcepts(state) {
  return state.contentBank.filter((c) => c.status === "AVAILABLE");
}

export function lastScheduledTime(state) {
  if (state.lastScheduledTime) return new Date(state.lastScheduledTime);
  const all = state.reels
    .map((r) => new Date(r.scheduledTime))
    .filter((d) => !isNaN(d));
  if (all.length === 0) return new Date();
  return new Date(Math.max(...all.map((d) => d.getTime())));
}
