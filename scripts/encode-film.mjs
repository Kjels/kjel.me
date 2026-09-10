// Encode a video into a 1-bit film the board can play: every frame is a bitmap of
// on/off dots, stored as the XOR against the previous frame, run-length encoded.
// Silhouette animation compresses enormously this way; flat areas cost nothing.
//
//   node scripts/encode-film.mjs bad-apple.mp4 public/film/bad-apple.bin
//   node scripts/encode-film.mjs --synth public/film/test.bin
//
// Options: --w 160 --h 120 --fps 20 --threshold 110 --invert
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf("--" + name); return i < 0 ? dflt : Number(argv[i + 1]); };
const flag = (name) => argv.includes("--" + name);
const files = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["synth", "invert"].includes(argv[i - 1].slice(2))));

const W = opt("w", 160), H = opt("h", 120), FPS = opt("fps", 20), THRESH = opt("threshold", 110), INVERT = flag("invert");
const synth = flag("synth");
const input = synth ? null : files[0];
const output = files[synth ? 0 : 1];
if (!output) { console.error("usage: encode-film.mjs <input.mp4|--synth> <output.bin> [--w 160 --h 120 --fps 20 --threshold 110 --invert]"); process.exit(1); }

/** grey frames, W*H bytes each, from ffmpeg */
function fromVideo(path) {
  return new Promise((res, rej) => {
    const ff = spawn("ffmpeg", ["-v", "error", "-i", path,
      "-vf", `fps=${FPS},scale=${W}:${H}:flags=area,format=gray`,
      "-f", "rawvideo", "-pix_fmt", "gray", "-"]);
    const chunks = [];
    ff.stdout.on("data", (c) => chunks.push(c));
    ff.stderr.on("data", (c) => process.stderr.write(c));
    ff.on("close", (code) => (code ? rej(new Error("ffmpeg exited " + code)) : res(Buffer.concat(chunks))));
  });
}

/** a stand-in film so the pipeline can be tested without a video: rings and a bouncing dot */
function synthFrames(n = 160) {
  const out = Buffer.alloc(W * H * n);
  for (let f = 0; f < n; f++) {
    const t = f / n, bx = W / 2 + Math.cos(t * Math.PI * 6) * W * 0.32, by = H / 2 + Math.sin(t * Math.PI * 4) * H * 0.3;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - W / 2, (y - H / 2) * 1.2);
      const ring = Math.sin(d * 0.35 - t * Math.PI * 8) > 0.55;
      const ball = Math.hypot(x - bx, (y - by) * 1.2) < 7;
      out[f * W * H + y * W + x] = ring || ball ? 255 : 0;
    }
  }
  return out;
}

const varint = (n, out) => { while (n >= 0x80) { out.push((n & 0x7f) | 0x80); n >>>= 7; } out.push(n); };

const grey = synth ? synthFrames() : await fromVideo(input);
const px = W * H, frames = Math.floor(grey.length / px);
if (!frames) { console.error("no frames"); process.exit(1); }

const prev = new Uint8Array(px), cur = new Uint8Array(px);
const bodies = [];
for (let f = 0; f < frames; f++) {
  const base = f * px;
  for (let i = 0; i < px; i++) { const on = grey[base + i] > THRESH; cur[i] = (INVERT ? !on : on) ? 1 : 0; }
  // run-length the XOR: alternating runs of unchanged and flipped cells, starting unchanged
  const runs = [];
  let run = 0, want = 0;
  for (let i = 0; i < px; i++) {
    const bit = cur[i] ^ prev[i];
    if (bit === want) run++;
    else { runs.push(run); want ^= 1; run = 1; }
  }
  runs.push(run);
  const body = [];
  for (const r of runs) varint(r, body);
  bodies.push(Buffer.from(body));
  prev.set(cur);
}

const head = Buffer.alloc(16);
head.write("FDF1", 0, "ascii");
head.writeUInt16LE(W, 4); head.writeUInt16LE(H, 6);
head.writeUInt8(FPS, 8); head.writeUInt32LE(frames, 9);
const parts = [head];
for (const b of bodies) { const len = Buffer.alloc(4); len.writeUInt32LE(b.length, 0); parts.push(len, b); }
const out = Buffer.concat(parts);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, out);
console.log(`${output}  ${W}x${H}  ${frames} frames @ ${FPS}fps  ${(out.length / 1024).toFixed(0)} KB  (${(out.length / frames).toFixed(0)} B/frame)`);
