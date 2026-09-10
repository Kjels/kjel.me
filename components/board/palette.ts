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
/** the same ramp for a board with no unlit grid: it cools into the background */
export const HEAT_FREE = Array.from({ length: 8 }, (_, k) => lerpHex(BG, ON, (0.2 * (k + 1)) / 8));

/* ---------- the accent: the one colour on the board, swappable live ---------- */
/** the candidates, each quoting a real display. hex without # */
export const ACCENTS: { name: string; hex: string; note: string }[] = [
  { name: "AMBER", hex: "ffb000", note: "flip-dot and LED destination boards. the default" },
  { name: "VFD", hex: "78ebd2", note: "vacuum fluorescent, hi-fi and microwaves" },
  { name: "PHOSPHOR", hex: "33ff66", note: "P1 oscilloscope green" },
  { name: "SIGNAL", hex: "ff453a", note: "railway and alarm red" },
  { name: "SODIUM", hex: "ff963c", note: "streetlamp orange" },
  { name: "LIME", hex: "60ff8c", note: "where it started" },
];
export const DEFAULT_ACCENT = "ffb000";
let accent = DEFAULT_ACCENT;
const hexToRgb = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** the current accent as "r,g,b", for rgba() strings in the engine */
export const accentRGB = () => hexToRgb(accent).join(",");
export const accentHex = () => accent;
export const accentCSS = () => `rgb(${accentRGB()})`;
/** set the accent everywhere: the engine reads it each frame, CSS through --live, React through the "accent" event */
export function setAccent(hex: string) {
  const h = hex.replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(h)) return false;
  accent = h;
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--live", accentCSS());
    try { localStorage.setItem("accent", h); } catch {}
    window.dispatchEvent(new Event("accent"));
  }
  return true;
}
/** the accent from ?accent=hex, then localStorage, then the default */
export function initAccent() {
  if (typeof location === "undefined") return;
  const q = new URLSearchParams(location.search).get("accent");
  let saved: string | null = null;
  try { saved = localStorage.getItem("accent"); } catch {}
  setAccent(q || saved || DEFAULT_ACCENT);
}
