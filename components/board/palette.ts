// The board's three colours and the afterglow ramp between off and on.
export const ON = "#f4f4f2";
export const OFF = "#1d1d1d";
export const BG = "#0a0a0a";

const lerpHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => (v + (pb[i] - v) * t) | 0).join(",")})`;
};

/** a dot that just flipped off cools through these, hottest first */
export const HEAT = Array.from({ length: 8 }, (_, k) => lerpHex(OFF, ON, (0.12 * (k + 1)) / 8));
