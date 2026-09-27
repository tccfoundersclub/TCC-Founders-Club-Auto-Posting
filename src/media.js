import { execFileSync } from "node:child_process";
import path from "node:path";

const VIDEO_EXTS = new Set([".mp4", ".mov", ".m4v", ".avi", ".mkv"]);

export function isVideo(fileName) {
  return VIDEO_EXTS.has(path.extname(fileName).toLowerCase());
}

// Normalizes an image to the same 4:5 canvas, re-encoded as JPEG.
export function compileImage(inputPath, outputPath) {
  execFileSync("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-vf", "scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350",
    outputPath,
  ], { stdio: "inherit" });
  return outputPath;
}

function defaultFontPath() {
  // Ubuntu (GitHub Actions runner, after `apt-get install fonts-dejavu-core`)
  if (process.platform === "linux") {
    return "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
  }
  // Windows, for local testing
  return "C:/Windows/Fonts/arialbd.ttf";
}

function escapeDrawtext(text) {
  return text.replace(/\\/g, "\\\\\\\\").replace(/:/g, "\\:").replace(/'/g, "\u2019");
}

// Builds a "Silent Film Storytelling Reel" (the format behind some of the
// best-performing creator content: no talking, just music + B-roll + on-screen
// text carrying the narrative). Takes a sequence of short text beats, each
// shown for its own time window, so the on-screen copy tells a mini story arc
// (hook -> tension -> insight -> CTA) over the clip instead of one static line.
// musicPath is optional - if omitted, the clip's original audio is kept as-is.
export function compileReel({ inputPath, outputPath, beats = [], musicPath, fontPath }) {
  const safeFontPath = (fontPath || defaultFontPath()).replace(/:/g, "\\:");

  const beatFilters = beats
    .map(({ text, start, end }) => {
      const safeText = escapeDrawtext(text);
      return `,drawtext=fontfile='${safeFontPath}':text='${safeText}':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=140:line_spacing=10:box=1:boxcolor=black@0.45:boxborderw=24:enable='between(t\\,${start}\\,${end})'`;
    })
    .join("");

  const args = ["-y", "-i", inputPath];
  if (musicPath) args.push("-i", musicPath);

  const videoChain = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920${beatFilters}[vout]`;

  let filterComplex;
  let maps;
  if (musicPath) {
    filterComplex =
      `${videoChain};` +
      `[0:a]volume=1.0[a0];` +
      `[1:a]volume=0.30[a1];` +
      `[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]`;
    maps = ["-map", "[vout]", "-map", "[aout]"];
  } else {
    filterComplex = videoChain;
    maps = ["-map", "[vout]", "-map", "0:a?"];
  }

  args.push(
    "-filter_complex", filterComplex,
    ...maps,
    "-t", "58",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath
  );

  execFileSync("ffmpeg", args, { stdio: "inherit" });
  return outputPath;
}
