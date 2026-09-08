// Pictograms for the ledger: one small animation per project, drawn as
// standalone lit dots on a Board with no grid. Each is the mechanism of the
// thing, not an icon of it. `t` is the pictogram's own clock in seconds;
// the host scales it (slow at rest, full speed on hover).

import type { Board, Layer } from "./engine";
import { glyphM } from "./font";
import { hash2 } from "./raster";

export type Picto = (b: Board, L: Layer, t: number) => void;

const put = (L: Layer, b: Board, x: number, y: number) => {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi >= 0 && xi < b.cols && yi >= 0 && yi < b.rows) L.mask[yi * b.cols + xi] = 1;
};
const line = (L: Layer, b: Board, x0: number, y0: number, x1: number, y1: number, step = 1) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
  for (let i = 0; i <= n; i++) put(L, b, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
};
const block = (L: Layer, b: Board, x: number, y: number, w: number, h: number) => {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) put(L, b, x + dx, y + dy);
};
const digits = (L: Layer, b: Board, s: string, x: number, y: number) => {
  let cx = x;
  for (const ch of s) {
    const g = glyphM(ch);
    for (let r = 0; r < 5; r++) for (let c = 0; c < g[0].length; c++) if (g[r][c] === "1") put(L, b, cx + c, y + r);
    cx += g[0].length + 1;
  }
};
const measureDigits = (s: string) => [...s].reduce((w, ch) => w + glyphM(ch)[0].length + 1, 0) - 1;
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2);

/** KIMS: things land on a platform, the reading settles, the platform clears. */
const kims: Picto = (b, L, t) => {
  const { cols, rows } = b;
  const cx = Math.round(cols * 0.42), py = Math.round(rows * 0.7), pw = 15;
  // the platform and its two legs
  line(L, b, cx - pw / 2, py, cx + pw / 2, py);
  put(L, b, cx - pw / 2 + 2, py + 1); put(L, b, cx + pw / 2 - 2, py + 1);
  line(L, b, cx - pw / 2 + 2, py + 2, cx + pw / 2 - 2, py + 2);
  // the cycle: 12 dots fall and pile up over 4s, the pile holds 2.4s, then clears
  const CYCLE = 8, tt = t % CYCLE;
  const N = 12;
  const slots: [number, number][] = [[0, 1], [-1, 1], [1, 1], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2], [-3, 1], [3, 1], [0, 3], [-2, 2]];
  let landed = 0;
  for (let k = 0; k < N; k++) {
    const t0 = 0.15 + k * 0.3, dur = 0.55;
    if (tt < t0) break;
    const [sx, sy] = slots[k];
    const tx = cx + sx, ty = py - sy;
    if (tt >= t0 + dur) { if (tt < CYCLE - 1.4) put(L, b, tx, ty); landed++; continue; }
    const p = ease((tt - t0) / dur);
    put(L, b, tx, ty - (1 - p) * (py - 2));
  }
  // the reading, right of the platform, counting with the pile
  if (tt < CYCLE - 1.4) {
    const grams = String(landed * 40);
    digits(L, b, grams, cx + pw / 2 + 4, py - 5);
    digits(L, b, "G", cx + pw / 2 + 4 + measureDigits(grams) + 2, py - 5);
  }
};

/** kjel.me: the dithered sweep, filling then clearing, forever. */
const kjelMe: Picto = (b, L, t) => {
  const { cols, rows } = b;
  const w = Math.min(cols - 6, 22), h = Math.min(rows - 6, 11);
  const x0 = Math.round((cols - w) / 2), y0 = Math.round((rows - h) / 2);
  const CYCLE = 4.4, tt = t % CYCLE, half = CYCLE / 2;
  const filling = tt < half;
  const sweep = ease((tt % half) / half) * (w + 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const past = x + hash2(x, y) * 3 < sweep;
    if (filling ? past : !past) put(L, b, x0 + x, y0 + y);
  }
};

/** Harness: two machines; a session crosses between them and comes back. */
const harness: Picto = (b, L, t) => {
  const { cols, rows } = b;
  const y = Math.round(rows / 2) - 1;
  const lx = Math.round(cols * 0.22), rx = Math.round(cols * 0.78) - 3;
  block(L, b, lx, y - 1, 3, 3); block(L, b, rx, y - 1, 3, 3);
  const CYCLE = 5, tt = t % CYCLE;
  const a = lx + 4, z = rx - 2;
  // out, pause, back, pause
  if (tt < 1.6) put(L, b, a + (z - a) * ease(tt / 1.6), y);
  else if (tt < 2.5) { block(L, b, rx - 1, y - 2, 5, 5); }
  else if (tt < 4.1) put(L, b, z - (z - a) * ease((tt - 2.5) / 1.6), y);
  else block(L, b, lx - 1, y - 2, 5, 5);
};

/** Capture: loose input falls in and sorts itself into three columns. */
const capture: Picto = (b, L, t) => {
  const { cols, rows } = b;
  const base = Math.round(rows * 0.8), colsX = [0.28, 0.5, 0.72].map((f) => Math.round(cols * f));
  const CYCLE = 9, tt = t % CYCLE, N = 15;
  const heights = [0, 0, 0];
  for (let k = 0; k < N; k++) {
    const t0 = k * 0.42, dur = 0.7;
    if (tt < t0) break;
    const lane = Math.floor(hash2(k, 7) * 3);
    const tx = colsX[lane], ty = base - heights[lane];
    if (tt >= t0 + dur) { heights[lane]++; if (tt < CYCLE - 1.6) put(L, b, tx, ty); continue; }
    const p = ease((tt - t0) / dur);
    const sx = Math.round(cols / 2) + (hash2(k, 3) - 0.5) * 6;
    put(L, b, sx + (tx - sx) * p, 1 + (ty - 1) * p * p);
  }
  // the three lanes' floor
  for (const x of colsX) { put(L, b, x - 1, base + 1); put(L, b, x, base + 1); put(L, b, x + 1, base + 1); }
};

/** Sprint Orchestrator: a task graph run in waves. */
const sprint: Picto = (b, L, t) => {
  const { cols, rows } = b;
  const cx = cols / 2, cy = rows / 2;
  // nodes by layer: 1, 3, 2, 1
  const layers: [number, number][][] = [
    [[cx - 11, cy]],
    [[cx - 4, cy - 5], [cx - 4, cy], [cx - 4, cy + 5]],
    [[cx + 4, cy - 3], [cx + 4, cy + 3]],
    [[cx + 11, cy]],
  ];
  const edges: [number, number, number, number][] = [
    [0, 0, 1, 0], [0, 0, 1, 1], [0, 0, 1, 2],
    [1, 0, 2, 0], [1, 1, 2, 0], [1, 1, 2, 1], [1, 2, 2, 1],
    [2, 0, 3, 0], [2, 1, 3, 0],
  ];
  const CYCLE = 6, tt = t % CYCLE;
  const wave = tt < 4.2 ? tt / 1.05 : -1; // layer index reached, fractional
  for (let li = 0; li < layers.length; li++) for (const [x, y] of layers[li]) {
    const on = wave >= li;
    if (on) block(L, b, Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    else { put(L, b, Math.round(x) - 1, Math.round(y) - 1); put(L, b, Math.round(x), Math.round(y)); }
  }
  for (const [la, ia, lb, ib] of edges) {
    const [x0, y0] = layers[la][ia], [x1, y1] = layers[lb][ib];
    const p = Math.max(0, Math.min(1, wave - la)); // how far the wave has travelled along this edge
    if (p <= 0) continue;
    line(L, b, x0 + 1, y0, x0 + 1 + (x1 - 2 - x0 - 1) * p, y0 + (y1 - y0) * p, 2);
  }
};

export const PICTOS: Record<string, Picto> = {
  kims,
  "kjel-me": kjelMe,
  harness,
  capture,
  "sprint-orchestrator": sprint,
};
