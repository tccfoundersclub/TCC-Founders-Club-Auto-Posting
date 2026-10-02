// Single source of truth for reel visual style - font sizes, weights, line
// heights, colors, and coordinates all live in one versioned JSON file
// instead of being duplicated across renderer scripts. Generated from the
// TCC Reel Style Studio export (see content-library/styles/exports/
// TCC-Reel-Template.json) and normalized here into the full set of font
// pairings/treatments the studio documents. To bring in a newer export,
// see "Updating the style" in content-library/STYLE.md.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(PROJECT_ROOT, "content-library", "styles", "tcc-reel-style.v1.json");

function validate(config) {
  const errors = [];

  for (const [roleName, role] of Object.entries(config.roles || {})) {
    if (!role.range || role.range.length !== 2) {
      errors.push(`role "${roleName}" is missing a valid [min,max] range`);
      continue;
    }
    const [min, max] = role.range;
    if (role.size < min || role.size > max) {
      errors.push(`role "${roleName}" size ${role.size}px is outside its documented range ${min}-${max}px`);
    }
  }

  const { top, bottom } = config.guardrail || {};
  if (typeof top !== "number" || typeof bottom !== "number" || top >= bottom) {
    errors.push(`guardrail top/bottom (${top}/${bottom}) is not a valid range`);
  }

  for (const [pairingKey, pairing] of Object.entries(config.fontPairings || {})) {
    for (const part of ["hook", "body", "subtitle", "cta"]) {
      const family = pairing[`${part}Font`];
      const weight = pairing[`${part}Weight`];
      if (!family || !weight) continue; // optional parts (e.g. no dedicated subtitle font) are fine
      const familyFiles = (config.fontFiles || {})[family];
      if (!familyFiles || !familyFiles[weight]) {
        errors.push(`fontPairing "${pairingKey}" references ${family}/${weight}, which has no entry under fontFiles`);
      }
    }
  }

  if (errors.length) {
    throw new Error(`Invalid style config at ${CONFIG_PATH}:\n  - ${errors.join("\n  - ")}`);
  }
}

let cached = null;

export function loadStyleConfig() {
  if (cached) return cached;
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  const config = JSON.parse(raw);
  validate(config);
  cached = config;
  return config;
}

// Resolves a fontPairing + role (hook/body/subtitle/cta) to an absolute
// font file path on disk, throwing clearly (not silently substituting -
// see PLATFORMS.md-style "never silently drop a requirement" convention)
// if the bundled file is missing.
export function resolveFontFile(config, pairingKey, part) {
  const pairing = config.fontPairings[pairingKey];
  if (!pairing) throw new Error(`Unknown font pairing "${pairingKey}". Known: ${Object.keys(config.fontPairings).join(", ")}`);
  const family = pairing[`${part}Font`];
  const weight = pairing[`${part}Weight`];
  if (!family || !weight) throw new Error(`Font pairing "${pairingKey}" has no "${part}" font defined`);
  const relPath = config.fontFiles[family]?.[weight];
  if (!relPath) throw new Error(`No fontFiles entry for ${family}/${weight} (pairing "${pairingKey}", part "${part}")`);
  const absPath = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(absPath)) throw new Error(`Font file not bundled on disk: ${absPath} (pairing "${pairingKey}", part "${part}") - do not silently substitute a system font; add the real file under assets/fonts/ instead.`);
  return absPath;
}

export function getTreatment(config, treatmentKey) {
  const treatment = config.treatments[treatmentKey || config.defaultTreatment];
  if (!treatment) throw new Error(`Unknown treatment "${treatmentKey}". Known: ${Object.keys(config.treatments).join(", ")}`);
  return treatment;
}
