import fs from "node:fs";
import zlib from "node:zlib";

// Minimal WOFF1 -> TTF/OTF converter. WOFF1 is just a header + a table
// directory + zlib-compressed (or raw) sfnt table data. No external deps
// needed since Node's zlib can inflate the per-table streams directly.
function convert(inPath, outPath) {
  const buf = fs.readFileSync(inPath);
  if (buf.readUInt32BE(0) !== 0x774f4646) {
    throw new Error(`${inPath} is not a WOFF1 file (bad signature)`);
  }
  const flavor = buf.readUInt32BE(4); // sfnt version (0x00010000 or 'OTTO')
  const numTables = buf.readUInt16BE(12);

  const entries = [];
  let p = 44; // end of WOFF header
  for (let i = 0; i < numTables; i++) {
    const tag = buf.toString("ascii", p, p + 4);
    const offset = buf.readUInt32BE(p + 4);
    const compLength = buf.readUInt32BE(p + 8);
    const origLength = buf.readUInt32BE(p + 12);
    const origChecksum = buf.readUInt32BE(p + 16);
    entries.push({ tag, offset, compLength, origLength, origChecksum });
    p += 20;
  }

  const tableData = entries.map((e) => {
    const raw = buf.subarray(e.offset, e.offset + e.compLength);
    if (e.compLength === e.origLength) return raw; // stored, not compressed
    return zlib.inflateSync(raw);
  });

  // Build sfnt offset table + table directory.
  const searchRange = (() => {
    let maxPow2 = 1, entrySelector = 0;
    while (maxPow2 * 2 <= numTables) { maxPow2 *= 2; entrySelector++; }
    return { searchRange: maxPow2 * 16, entrySelector, rangeShift: numTables * 16 - maxPow2 * 16 };
  })();

  const headerSize = 12 + numTables * 16;
  let dataOffset = headerSize;
  const dirEntries = entries.map((e, i) => {
    const length = e.origLength;
    const off = dataOffset;
    dataOffset += length;
    if (dataOffset % 4 !== 0) dataOffset += 4 - (dataOffset % 4); // pad to 4 bytes
    return { tag: e.tag, checksum: e.origChecksum, offset: off, length };
  });

  const out = Buffer.alloc(dataOffset);
  out.writeUInt32BE(flavor, 0);
  out.writeUInt16BE(numTables, 4);
  out.writeUInt16BE(searchRange.searchRange, 6);
  out.writeUInt16BE(searchRange.entrySelector, 8);
  out.writeUInt16BE(searchRange.rangeShift, 10);

  let dirP = 12;
  dirEntries.forEach((d) => {
    out.write(d.tag, dirP, "ascii");
    out.writeUInt32BE(d.checksum, dirP + 4);
    out.writeUInt32BE(d.offset, dirP + 8);
    out.writeUInt32BE(d.length, dirP + 12);
    dirP += 16;
  });

  dirEntries.forEach((d, i) => {
    tableData[i].copy(out, d.offset);
  });

  fs.writeFileSync(outPath, out);
  return outPath;
}

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node woff2ttf.js <in.woff> <out.ttf>");
  process.exit(1);
}
convert(inPath, outPath);
console.log(`Converted: ${outPath}`);
