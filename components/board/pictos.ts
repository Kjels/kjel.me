// Pictograms for the ledger: small symbols on a 7x5 grid of standalone dots,
// in the same spirit as the identity's pictograms (arrow, plus, solidus).
// Each has two or three frames and steps between them slowly. `t` is the
// pictogram's own clock in seconds.

import type { Board, Layer } from "./engine";

export type Picto = (b: Board, L: Layer, t: number) => void;

const GW = 7, GH = 5;

/** draw a 7x5 frame (row strings, "1" lit) centred on the board */
function frame(b: Board, L: Layer, rows: string[]) {
  const ox = Math.floor((b.cols - GW) / 2), oy = Math.floor((b.rows - GH) / 2);
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    if (rows[y][x] !== "1") continue;
    const xx = ox + x, yy = oy + y;
    if (xx >= 0 && xx < b.cols && yy >= 0 && yy < b.rows) L.mask[yy * b.cols + xx] = 1;
  }
}

/** step through frames, holding each for `hold` seconds */
const cycle = (frames: string[][], hold: number): Picto => (b, L, t) => frame(b, L, frames[Math.floor(t / hold) % frames.length]);

/** KIMS: a platform; something is set on it, then taken off. */
const kims = cycle([
  ["0000000", "0000000", "0000000", "0000000", "0111110"],
  ["0000000", "0000000", "0001000", "0000000", "0111110"],
  ["0000000", "0000000", "0000000", "0011100", "0111110"],
  ["0000000", "0000000", "0000000", "0011100", "0111110"],
], 1.4);

/** kjel.me: a bar of dots with one flipping through it, the sweep in miniature. */
const kjelMe = cycle([
  ["0000000", "0000000", "0111110", "0000000", "0000000"],
  ["0000000", "0000000", "0011110", "0000000", "0000000"],
  ["0000000", "0000000", "0101110", "0000000", "0000000"],
  ["0000000", "0000000", "0110110", "0000000", "0000000"],
  ["0000000", "0000000", "0111010", "0000000", "0000000"],
  ["0000000", "0000000", "0111100", "0000000", "0000000"],
], 0.9);

/** Harness: two machines; the session sits with one, then the other. */
const harness = cycle([
  ["0000000", "1100011", "1101011", "1100011", "0000000"],
  ["0000000", "1100011", "1100011", "1100011", "0000000"],
  ["0000000", "1100011", "1100011", "1100011", "0000000"],
  ["0000000", "1100011", "1110011", "1100011", "0000000"],
], 1.1);

/** Capture: loose, then sorted. */
const capture = cycle([
  ["0100010", "0000100", "0000000", "0000000", "0000000"],
  ["0000000", "0000000", "0000000", "0000000", "0101010"],
  ["0000000", "0000000", "0000000", "0000000", "0101010"],
  ["0000000", "0000000", "0000000", "0000000", "0101010"],
], 1.6);

/** Sprint Orchestrator: three nodes, the work passing along the edges. */
const sprint = cycle([
  ["0000000", "0000000", "1010101", "0000000", "0000000"],
  ["0000000", "0000000", "1110101", "0000000", "0000000"],
  ["0000000", "0000000", "1011101", "0000000", "0000000"],
  ["0000000", "0000000", "1010111", "0000000", "0000000"],
], 1.0);

export const PICTOS: Record<string, Picto> = {
  kims,
  "kjel-me": kjelMe,
  harness,
  capture,
  "sprint-orchestrator": sprint,
};
