// Each project's mark is a lifeform from the identity's fauna, run live under
// Conway's rule B3/S23 on a small torus. Unique per project, alive by
// definition, one generation every 0.8s. `t` is the mark's own clock.

import type { Board, Layer } from "./engine";

export type Picto = (b: Board, L: Layer, t: number) => void;

export const SIZE = 9; // the torus
const GEN = 0.8; // seconds per generation

function life(seed: string[]): Picto {
  const N = SIZE;
  let cells = new Uint8Array(N * N);
  let at = -1;
  const reset = () => {
    cells = new Uint8Array(N * N);
    const oy = Math.floor((N - seed.length) / 2), ox = Math.floor((N - seed[0].length) / 2);
    for (let y = 0; y < seed.length; y++) for (let x = 0; x < seed[y].length; x++) if (seed[y][x] === "1") cells[(oy + y) * N + ox + x] = 1;
  };
  const step = () => {
    const nb = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        c += cells[((y + dy + N) % N) * N + ((x + dx + N) % N)];
      }
      nb[y * N + x] = (cells[y * N + x] ? c === 2 || c === 3 : c === 3) ? 1 : 0;
    }
    cells = nb;
  };
  return (b, L, t) => {
    const g = Math.floor(t / GEN) % 400; // reseed every 400 generations, in case a torus gets stale
    if (g < at || at < 0) { reset(); at = 0; }
    while (at < g) { step(); at++; }
    const ox = Math.floor((b.cols - N) / 2), oy = Math.floor((b.rows - N) / 2);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!cells[y * N + x]) continue;
      const xx = ox + x, yy = oy + y;
      if (xx >= 0 && xx < b.cols && yy >= 0 && yy < b.rows) L.mask[yy * b.cols + xx] = 1;
    }
  };
}

export const PICTOS: Record<string, Picto> = {
  kims: life(["0111", "1110"]), // toad, period 2
  "kjel-me": life(["010", "001", "111"]), // glider, moves
  harness: life(["01111", "10001", "00001", "10010"]), // lightweight spaceship, moves
  capture: life(["1100", "1000", "0001", "0011"]), // beacon, period 2
  "sprint-orchestrator": life(["0100", "1010", "0101", "0010"]), // clock, period 2
};
