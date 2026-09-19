// Copy a supplied JPEG for the public site without private editing/camera metadata.
// The compressed image stream and color profile are preserved byte-for-byte.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [source, destination] = process.argv.slice(2);
if (!source || !destination || resolve(source) === resolve(destination)) {
  throw new Error("Provide distinct source and destination JPEG paths.");
}
const input = readFileSync(source);
if (input.readUInt16BE(0) !== 0xffd8) throw new Error("Expected a JPEG image.");
const chunks = [input.subarray(0, 2)];
const removed = [];
let offset = 2;
let foundScan = false;
while (offset < input.length) {
  const start = offset;
  if (input[offset++] !== 0xff) throw new Error("Invalid JPEG marker.");
  while (input[offset] === 0xff) offset++;
  const marker = input[offset++];
  if (marker === 0xda) {
    chunks.push(input.subarray(start));
    foundScan = true;
    break;
  }
  if (offset + 2 > input.length) throw new Error("Truncated JPEG.");
  const length = input.readUInt16BE(offset);
  if (length < 2 || offset + length > input.length) throw new Error("Invalid segment length.");
  const end = offset + length;
  if ([0xe1, 0xed, 0xfe].includes(marker)) removed.push(marker.toString(16));
  else chunks.push(input.subarray(start, end));
  offset = end;
}
if (!foundScan) throw new Error("Image scan not found.");
const output = Buffer.concat(chunks);
writeFileSync(destination, output, { flag: "wx" });
console.log(JSON.stringify({ originalBytes: input.length, publicBytes: output.length, removedMetadataMarkers: removed, pixelsReencoded: false }));
