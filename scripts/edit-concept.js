import { loadState, saveState } from "../src/remoteState.js";

const EDITABLE_FIELDS = ["topic", "hook", "context", "caption", "cta"];

// Edits exactly one concept by its permanent ID, without touching anything
// else in the bank, queue, or schedule. Usage:
//   node scripts/edit-concept.js TCCFC-0147 hook "New hook text"
//   node scripts/edit-concept.js TCCFC-0147 points '["point one", "point two", "point three"]'
//
// - A concept still only in the content bank (AVAILABLE) is edited directly.
// - A concept already rendered into a SCHEDULED (not yet published) reel has
//   its text fields updated too, but the rendered video file still has the
//   OLD text burned in - this script flags needsRerender:true and prints a
//   clear warning rather than silently leaving stale video live.
// - A PUBLISHED reel's historical record is refused - it's immutable by
//   design, per the permanent anti-duplication archive requirement.
async function main() {
  const [conceptId, field, ...rest] = process.argv.slice(2);
  if (!conceptId || !field || rest.length === 0) {
    console.error('Usage: node scripts/edit-concept.js <TCCFC-####> <field> <value>');
    console.error(`Editable fields: ${EDITABLE_FIELDS.join(", ")}, points (JSON array)`);
    process.exit(1);
  }
  const rawValue = rest.join(" ");
  const value = field === "points" ? JSON.parse(rawValue) : rawValue;

  if (field !== "points" && !EDITABLE_FIELDS.includes(field)) {
    console.error(`Unknown field "${field}". Editable: ${EDITABLE_FIELDS.join(", ")}, points`);
    process.exit(1);
  }

  const state = await loadState();
  const reel = state.reels.find((r) => r.conceptId === conceptId);
  const bankEntry = state.contentBank.find((c) => c.conceptId === conceptId);

  if (!reel && !bankEntry) {
    console.error(`No concept found with ID ${conceptId}`);
    process.exit(1);
  }

  if (reel && reel.status === "PUBLISHED") {
    console.error(`REFUSED: ${conceptId} is already PUBLISHED. Historical records are immutable by design.`);
    process.exit(1);
  }

  const now = new Date().toISOString();

  if (bankEntry) {
    bankEntry[field] = value;
    bankEntry.revision = (bankEntry.revision || 1) + 1;
    bankEntry.lastModifiedAt = now;
    console.log(`Updated ${conceptId} (content bank) - ${field} -> revision ${bankEntry.revision}`);
  }

  if (reel && reel.status !== "PUBLISHED") {
    reel[field] = value;
    reel.revision = (reel.revision || 1) + 1;
    reel.lastModifiedAt = now;
    reel.needsRerender = true;
    console.log(`Updated ${conceptId} (rendered reel, status ${reel.status}) - ${field} -> revision ${reel.revision}`);
    console.log(`WARNING: this reel was already rendered with the old text. The video file at ${reel.mediaUrl} is now stale.`);
    console.log(`Re-render it before it publishes (rendering helper can be added on request), or it will publish with the OLD on-screen text despite this edit.`);
  }

  await saveState(state);
  console.log(`Run "node scripts/generate-content-library.js" to refresh the human-readable files.`);
}

main().catch((err) => {
  console.error("edit-concept failed:", err);
  process.exit(1);
});
