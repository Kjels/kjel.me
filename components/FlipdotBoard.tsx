"use client";

import { useEffect, useRef } from "react";
import { BOARD_DEFAULTS, type BoardText, type BoardBook } from "@/lib/board-text";

// kjel.me landing: the whole viewport is a simulated flip-dot board.
// A fixed left rail (mark/title + table of contents) persists across every page;
// content populates the field alongside it. Pages flip in place with a wipe.
// Text is a native 5x7 bitmap face (3x5 micro for links) stamped dot-for-dot.
// The slash through the J is Kjel's mark: a permanent dark cut.
// All pages are in-board; the media wall lives apart, unlinked, at /media.
// The portrait keeps home's upper-right; the cyclist laps the bottom edge.

const ON = "#f4f4f2";
const OFF = "#1d1d1d";
const BG = "#0a0a0a";
// afterglow palette: a dot that just flipped off cools through these
const lerpHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => (v + (pb[i] - v) * t) | 0).join(",")})`;
};
const HEAT = Array.from({ length: 8 }, (_, k) => lerpHex(OFF, ON, (0.12 * (k + 1)) / 8));
const NAV = ["BOOKS", "WORK", "NOW", "ABOUT", "NOTES"];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const F: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
  ",": ["00", "00", "00", "00", "00", "01", "10"],
  "'": ["1", "1", "0", "0", "0", "0", "0"],
  "-": ["000", "000", "000", "111", "000", "000", "000"],
  "&": ["01100", "10010", "10010", "01100", "10101", "10010", "01101"],
  "!": ["1", "1", "1", "1", "1", "0", "1"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  ":": ["0", "1", "0", "0", "0", "1", "0"],
  " ": ["000", "000", "000", "000", "000", "000", "000"],
};

// micro tier: 3x5 face for links only
const F3: Record<string, string[]> = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["1001", "1101", "1011", "1001", "1001"],
  O: ["111", "101", "101", "101", "111"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  W: ["10001", "10001", "10101", "11011", "10001"],
  C: ["011", "100", "100", "100", "011"],
  F: ["111", "100", "110", "100", "100"],
  G: ["0111", "1000", "1011", "1001", "0111"],
  H: ["101", "101", "111", "101", "101"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["0110", "1001", "1001", "0110", "0001"],
  V: ["101", "101", "101", "101", "010"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  ",": ["00", "00", "00", "01", "10"],
  "-": ["000", "000", "111", "000", "000"],
  "'": ["1", "1", "0", "0", "0"],
  ":": ["0", "1", "0", "1", "0"],
  ".": ["0", "0", "0", "0", "1"],
  " ": ["00", "00", "00", "00", "00"],
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "011", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  "/": ["001", "001", "010", "100", "100"],
};

// KJEL Brand DNA pictograms: dot-matrix, drawn on the same grid as the type.
// The solidus is the strike from the mark; the glider is a Conway lifeform.
const DS: Record<string, string[]> = {
  GLIDER: ["010", "001", "111"],
  SOLIDUS: ["00011", "00010", "00110", "00100", "01100", "01000", "11000"],
  SPOTIFY: [
    "001111100",
    "011111110",
    "110000001",
    "111111111",
    "110000011",
    "111111111",
    "111000111",
    "011111110",
    "001111100",
  ],
};

export function FlipdotBoard({ text, books }: { text?: BoardText; books?: BoardBook[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hotsRef = useRef<HTMLDivElement>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const booksRef = useRef(books);
  booksRef.current = books;

  useEffect(() => {
    // all editable copy (from /config via Blob); the defaults are the fallback
    const TXT: BoardText = textRef.current || BOARD_DEFAULTS;
    const PAGES = TXT.pages;
    // sequential, never random: a first visit always reads the sane ones first
    const ROLES = TXT.roles;
    const EXTERNAL: Record<string, string> = { LINKEDIN: TXT.linkedin, EMAIL: TXT.email };
    const BOOKS_DATA: BoardBook[] = booksRef.current || [];
    const canvas = canvasRef.current!;
    const hots = hotsRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const glyph = (ch: string) => F[ch] || F["?"] || F["."];
    const measureCols = (text: string) => {
      let w = 0;
      for (const ch of text.toUpperCase()) w += glyph(ch)[0].length + 1;
      return Math.max(0, w - 1);
    };
    const glyphM = (ch: string) => F3[ch] || F3["."];
    const measureM = (text: string) => {
      let w = 0;
      for (const ch of text.toUpperCase()) w += glyphM(ch)[0].length + 1;
      return Math.max(0, w - 1);
    };
    const hash2 = (x: number, y: number) => {
      let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
      h = (h ^ (h >>> 13)) * 1274126177;
      return (((h ^ (h >>> 16)) >>> 0) % 10000) / 10000;
    };

    /* ---------- portraits (keyed): resting + waving ---------- */
    const PW = 600, PH = 800;
    const portrait = document.createElement("canvas");
    portrait.width = PW; portrait.height = PH;
    const pctx = portrait.getContext("2d", { willReadFrequently: true })!;

    function keyBackdrop(c: CanvasRenderingContext2D) {
      const im = c.getImageData(0, 0, PW, PH), d = im.data;
      const N = PW * PH, thr = 226;
      const white = (i: number) => d[i * 4] > thr && d[i * 4 + 1] > thr && d[i * 4 + 2] > thr;
      const mask = new Uint8Array(N);
      const q: number[] = [];
      const seed = (i: number) => { if (!mask[i] && white(i)) { mask[i] = 1; q.push(i); } };
      for (let x = 0; x < PW; x++) { seed(x); seed((PH - 1) * PW + x); }
      for (let y = 0; y < PH; y++) { seed(y * PW); seed(y * PW + PW - 1); }
      while (q.length) {
        const i = q.pop()!, x = i % PW, y = (i / PW) | 0;
        if (x > 0) seed(i - 1);
        if (x < PW - 1) seed(i + 1);
        if (y > 0) seed(i - PW);
        if (y < PH - 1) seed(i + PW);
      }
      let a = Float32Array.from(mask);
      for (let p = 0; p < 2; p++) {
        const b = new Float32Array(N);
        for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
          let s = 0, n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && xx < PW && yy >= 0 && yy < PH) { s += a[yy * PW + xx]; n++; }
          }
          b[y * PW + x] = s / n;
        }
        a = b;
      }
      for (let i = 0; i < N; i++) {
        const k = 1 - a[i];
        d[i * 4] *= k; d[i * 4 + 1] *= k; d[i * 4 + 2] *= k;
      }
      c.putImageData(im, 0, 0);
    }

    function loadPortrait(srcUrl: string, c: CanvasRenderingContext2D, done: () => void) {
      const img = new Image();
      img.onload = () => {
        c.fillStyle = "#000"; c.fillRect(0, 0, PW, PH);
        const s = Math.max(PW / img.width, PH / img.height);
        const dw = img.width * s, dh = img.height * s;
        c.drawImage(img, (PW - dw) / 2, (PH - dh) / 2, dw, dh);
        keyBackdrop(c);
        done();
      };
      img.src = srcUrl;
    }

    /* ---------- board state ---------- */
    const src = document.createElement("canvas");
    const sctx = src.getContext("2d", { willReadFrequently: true })!;
    const offLayer = document.createElement("canvas");
    // the latched image: every dot that has landed lives here, stamped once.
    // Frames blit this and draw only the dots still in motion — the canvas
    // equivalent of a flip-dot's magnetic latch.
    const staticLayer = document.createElement("canvas");
    let stx: CanvasRenderingContext2D | null = null;

    let W = 0, H = 0, SW = 0, SH = 0, K = 1;
    let cols = 0, rows = 0, cw = 0, chh = 0;
    // one grid for the whole site: DENSITY scales the fixed design resolution
    // globally — every page, every element, never per-page. 1.8 is the chosen
    // grid. Debug only: press D to cycle presets, or force with ?d=1.5.
    const DENSITIES = [1, 1.25, 1.5, 1.8];
    let density = 1.8;
    try {
      const q = parseFloat(new URLSearchParams(location.search).get("d") || "");
      if (q >= 1 && q <= 2.2) density = q;
    } catch {}
    let cellLum: Float32Array | null = null;
    let textMask: Uint8Array | null = null;
    let prevLum: Float32Array | null = null, prevMask: Uint8Array | null = null;
    let dotV: Float32Array = new Float32Array(0);
    let currentPage = "HOME", transStart = -1;
    let slashLine: { ax: number; ay: number; bx: number; by: number } | null = null;
    let slashParam: Float32Array | null = null;
    let slashD: Float32Array | null = null;
    let faceBox: { x0: number; x1: number; y0: number; y1: number } | null = null;
    let guideOK: Uint8Array | null = null;
    let roleSpot: { col: number; row: number } | null = null;
    type LinkRec = { page: string; col: number; row: number; scale: number; wCols: number; gh: number; hover: boolean; hoverP: number };
    let links: LinkRec[] = [];
    const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';
    const TRANS = 0.75;

    function stamp(text: string, col: number, row: number, scale: number, link?: string, micro?: boolean, underline?: boolean) {
      const tm = textMask!;
      const gh = micro ? 5 : 7;
      const gf = micro ? glyphM : glyph;
      let cx = col;
      for (const ch of text.toUpperCase()) {
        const g = gf(ch), gw = g[0].length;
        for (let r = 0; r < gh; r++) for (let c = 0; c < gw; c++) {
          if (g[r][c] !== "1") continue;
          for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
            const yy = row + r * scale + sy, xx = cx + c * scale + sx;
            if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) tm[yy * cols + xx] = 2;
          }
        }
        cx += (gw + 1) * scale;
      }
      const wCols = (micro ? measureM(text) : measureCols(text)) * scale;
      if (underline) {
        // a solid dot rule beneath — marks the current page and the title
        const uh = 1;
        const uy = row + gh * scale + (scale > 1 ? 2 : 1);
        for (let dy = 0; dy < uh; dy++) for (let c2 = 0; c2 < wCols; c2++) {
          const yy = uy + dy, xx = col + c2;
          if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) tm[yy * cols + xx] = 2;
        }
      }
      if (link) {
        const rec: LinkRec = { page: link, col, row, scale, wCols, gh, hover: false, hoverP: 0 };
        links.push(rec);
        const a = document.createElement("a");
        a.className = "fd-hot";
        a.setAttribute("aria-label", link.toLowerCase());
        // hot areas never dip below the 44px touch minimum, centered on the glyphs
        const hw = Math.max(44, wCols * cw + 12), hh2 = Math.max(44, gh * scale * chh + 12);
        a.style.left = `${col * cw + (wCols * cw) / 2 - hw / 2}px`;
        a.style.top = `${row * chh + (gh * scale * chh) / 2 - hh2 / 2}px`;
        a.style.width = `${hw}px`;
        a.style.height = `${hh2}px`;
        const ext = EXTERNAL[link];
        a.href = ext || "#";
        if (ext && !ext.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noreferrer"; }
        if (!ext) {
          a.addEventListener("click", (e) => { e.preventDefault(); navigate(link); });
        }
        a.addEventListener("mouseenter", () => { rec.hover = true; wake(); });
        a.addEventListener("mouseleave", () => { rec.hover = false; wake(); });
        a.addEventListener("focus", () => { rec.hover = true; wake(); });
        a.addEventListener("blur", () => { rec.hover = false; wake(); });
        hots.appendChild(a);
      }
      return wCols;
    }

    function marker(col: number, row: number) {
      const tm = textMask!;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const yy = row + dy, xx = col + dx;
        if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) tm[yy * cols + xx] = 4;
      }
    }

    function stampG(pat: string[], col: number, row: number) {
      const tm = textMask!;
      for (let r = 0; r < pat.length; r++) for (let c = 0; c < pat[r].length; c++) {
        if (pat[r][c] !== "1") continue;
        const yy = row + r, xx = col + c;
        if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) tm[yy * cols + xx] = 2;
      }
    }

    // CMD/003: the smiley, struck through like the J
    function stampSmiley(cx: number, cy: number, r: number, struck: boolean) {
      const tm = textMask!;
      const dot = (x: number, y: number) => {
        const xx = Math.round(x), yy = Math.round(y);
        if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) tm[yy * cols + xx] = 2;
      };
      const n = Math.max(20, Math.round(r * 8));
      for (let a = 0; a < n; a++) {
        const th = (a / n) * Math.PI * 2;
        dot(cx + Math.cos(th) * r, cy + Math.sin(th) * r);
      }
      const es = Math.max(2, Math.round(r * 0.16));
      const ey = cy - Math.round(r * 0.35), ex = Math.round(r * 0.38);
      for (const s of [-1, 1]) for (let dy = 0; dy < es; dy++) for (let dx = 0; dx < es; dx++)
        dot(cx + s * ex + (s < 0 ? -dx : dx), ey + dy);
      const sw = Math.round(r * 0.55), sy = cy + Math.round(r * 0.42);
      for (let x = -sw; x <= sw; x++) dot(cx + x, sy - (Math.abs(x) > sw * 0.6 ? 1 : 0));
      dot(cx - sw - 1, sy - 2); dot(cx + sw + 1, sy - 2);
      dot(cx - sw - 2, sy - 3); dot(cx + sw + 2, sy - 3);
      if (struck) {
        const x0 = cx + r * 0.6, y0 = cy - r * 1.18, x1 = cx - r * 0.6, y1 = cy + r * 1.18;
        const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.6);
        for (let s = 0; s <= steps; s++) dot(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps);
      }
    }

    function block(col: number, row: number, w: number, h: number) {
      const tm = textMask!;
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
        const yy = row + dy, xx = col + dx;
        if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) tm[yy * cols + xx] = 2;
      }
    }

    function hotAt(xs: number, ys: number, ws: number, hs: number, label: string, fn?: () => void, href?: string) {
      const a = document.createElement("a");
      a.className = "fd-hot";
      a.href = href || "#";
      a.setAttribute("aria-label", label);
      a.style.left = `${xs}px`; a.style.top = `${ys}px`;
      a.style.width = `${ws}px`; a.style.height = `${hs}px`;
      if (fn) a.addEventListener("click", (e) => { e.preventDefault(); fn(); });
      hots.appendChild(a);
      return a;
    }

    function wrap(text: string, scale: number, maxCols: number) {
      const out: string[] = [];
      let line = "";
      for (const word of text.split(" ")) {
        const probe = line ? line + " " + word : word;
        if (measureCols(probe) * scale > maxCols && line) { out.push(line); line = word; }
        else line = probe;
      }
      if (line) out.push(line);
      return out;
    }

    function wrapM(text: string, maxCols: number) {
      const out: string[] = [];
      let line = "";
      for (const word of text.split(" ")) {
        const probe = line ? line + " " + word : word;
        if (measureM(probe) > maxCols && line) { out.push(line); line = word; }
        else line = probe;
      }
      if (line) out.push(line);
      return out;
    }

    function haloPass() {
      const tm = textMask!;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (tm[y * cols + x] < 2) continue;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && xx < cols && yy >= 0 && yy < rows && tm[yy * cols + xx] === 0)
            tm[yy * cols + xx] = 1;
        }
      }
    }

    function drawFace(cxScreen: number, cyScreen: number, scale: number, buf?: HTMLCanvasElement) {
      const s = Math.min(SW / PW, SH / PH) * scale;
      const dw = PW * s, dh = PH * s;
      sctx.drawImage(buf || portrait, cxScreen * K - dw / 2, cyScreen * K - dh / 2, dw, dh);
      const dws = dw / K, dhs = dh / K;
      faceBox = {
        x0: (cxScreen - dws / 2) / cw, x1: (cxScreen + dws / 2) / cw,
        y0: (cyScreen - dhs / 2) / chh, y1: (cyScreen + dhs / 2) / chh,
      };
      return dws;
    }

        function drawMark(cap: number, xLeft: number | null, by: number) {
      sctx.font = `800 ${((cap / 0.716) * K).toFixed(1)}px ${HELV}`;
      sctx.textAlign = "left"; sctx.textBaseline = "alphabetic"; sctx.fillStyle = "#fff";
      const wAll = sctx.measureText("KJEL").width / K;
      const x0 = xLeft === null ? (W - wAll) / 2 : xLeft;
      sctx.fillText("KJEL", x0 * K, by * K);
      const wK = sctx.measureText("K").width / K;
      const wKJ = sctx.measureText("KJ").width / K;
      const jx = x0 + (wK + wKJ) / 2;
      return { ax: jx + cap * 0.34, ay: by - cap * 1.12, bx: jx - cap * 0.3, by: by + cap * 0.22 };
    }

    function rasterToCells() {
      const d = sctx.getImageData(0, 0, SW, SH).data;
      const lum = new Float32Array(SW * SH);
      let lo = 1, hi = 0;
      for (let i = 0; i < SW * SH; i++) {
        const v = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
        lum[i] = v;
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
      const span = Math.max(0.05, hi - lo);
      const out = new Float32Array(cols * rows);
      const scw = SW / cols, sch = SH / rows;
      for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
        let sum = 0, n = 0;
        const x0 = Math.floor(gx * scw), x1 = Math.min(SW, Math.max(x0 + 1, Math.ceil((gx + 1) * scw)));
        const y0 = Math.floor(gy * sch), y1 = Math.min(SH, Math.max(y0 + 1, Math.ceil((gy + 1) * sch)));
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { sum += (lum[y * SW + x] - lo) / span; n++; }
        out[gy * cols + gx] = n ? sum / n : 0;
      }
      return out;
    }

    /* ---------- laser eyes: click the portrait, the meme happens ---------- */
    // pupil positions as fractions of the portrait frame
    const EYES: [number, number][] = [[0.386, 0.276], [0.55, 0.274]];
    let laserOn = false, laserP = 0;
    let laserMask: Float32Array | null = null;

    function buildLaser() {
      laserMask = null;
      if (!faceBox) return;
      const m = new Float32Array(cols * rows);
      const set = (x: number, y: number, v: number) => {
        const xi = Math.round(x), yi = Math.round(y);
        if (xi < 0 || xi >= cols || yi < 0 || yi >= rows) return;
        const i = yi * cols + xi;
        if (m[i] < v) m[i] = v;
      };
      const fw = faceBox.x1 - faceBox.x0, fh = faceBox.y1 - faceBox.y0;
      for (const [ex, ey] of EYES) {
        const cx = faceBox.x0 + ex * fw, cy = faceBox.y0 + ey * fh;
        // blazing glow around each eye, white-hot at the center
        for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
          const r = Math.hypot(dx, dy);
          if (r <= 1.6) set(cx + dx, cy + dy, 1);
          else if (r <= 6.5) set(cx + dx, cy + dy, 0.85 * (1 - r / 6.8));
        }
        // the long horizontal lens streak, blooming near the core
        for (const dir of [-1, 1]) for (let d = 1; d < 95; d++) {
          const v = 0.9 * Math.exp(-d / 26);
          if (v < 0.04) break;
          set(cx + dir * d, cy, v);
          if (d < 10) { set(cx + dir * d, cy - 1, v * 0.45); set(cx + dir * d, cy + 1, v * 0.45); }
        }
        // star rays
        for (const [ang, len] of [[-0.5, 13], [Math.PI - 0.5, 13], [0.55, 12], [Math.PI + 0.55, 12], [-1.15, 9], [1.15, 9], [Math.PI - 1.15, 9], [Math.PI + 1.15, 9]] as [number, number][]) {
          for (let d = 1; d <= len; d++)
            set(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 0.85 * (1 - d / (len + 3)));
        }
      }
      laserMask = m;
    }

    /* ---------- the books catalog: shelves → paginated tables → book pages ---------- */
    const cleanB = (s: string, micro?: boolean) => {
      let out = "";
      for (const ch of (s || "").toUpperCase()) if ((micro ? F3 : F)[ch] || ch === " ") out += ch;
      return out.replace(/\s+/g, " ").trim();
    };
    type BShelf = { id: string; label: string; books: BoardBook[] };
    function bookShelves(): BShelf[] {
      const B = BOOKS_DATA;
      const read = B.filter((b) => b.status !== "tbr");
      // the main shelf: whatever's open now leads, marked in the margin
      const all = [...read.filter((b) => b.status === "reading"), ...read.filter((b) => b.status !== "reading")];
      const s: BShelf[] = [{ id: "all", label: "ALL", books: all }];
      const favs = B.filter((b) => (b.rating ?? 0) >= 5);
      if (favs.length) s.push({ id: "favorites", label: "FAVORITES", books: favs });
      s.push({
        id: "recent",
        label: "RECENT",
        books: [...read].sort((a, b) => (b.intakeAt || "").localeCompare(a.intakeAt || "")),
      });
      const pile = B.filter((b) => b.status === "tbr");
      if (pile.length) s.push({ id: "pile", label: "THE PILE", books: pile });
      const genres = [...new Set(B.map((b) => b.genre).filter(Boolean))] as string[];
      for (const gn of genres.sort())
        s.push({
          id: "g-" + gn.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          label: cleanB(gn),
          books: B.filter((b) => b.genre === gn),
        });
      return s;
    }

    // rating on the book page: filled 2x2 blocks for the score, a lone dot for the rest
    function stampRating(col: number, row: number, n: number) {
      const tm = textMask!;
      for (let i = 0; i < 5; i++) {
        const x0 = col + i * 4;
        if (i < n) {
          for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
            const yy = row + dy, xx = x0 + dx;
            if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) tm[yy * cols + xx] = 2;
          }
        } else {
          const yy = row + 1, xx = x0;
          if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) tm[yy * cols + xx] = 2;
        }
      }
    }

    // rating in table rows: just the filled blocks, right-aligned
    function stampRatingN(col: number, row: number, n: number) {
      const tm = textMask!;
      for (let i = 0; i < n; i++)
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const yy = row + dy, xx = col + i * 4 + dx;
          if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) tm[yy * cols + xx] = 2;
        }
    }

    function composeBooks(page: string, g: { colL: number; titleTop: number; contentTop: number; right: number; wide: boolean }) {
      const shelves = bookShelves();
      let parts = page.split(":");
      if (parts.length === 1) parts = ["BOOKS", "SHELF", "all", "1"];
      const limit = rows - (g.wide ? 16 : 8);
      if (parts[1] === "SHELF") {
        const shelf = shelves.find((s) => s.id === parts[2]) || shelves[0];
        stamp("BOOKS", g.colL, g.titleTop, 2, undefined, false, true);
        // the filter rail: every shelf, the current one marked
        let fx = g.colL, fy = g.titleTop + 20;
        for (const s of shelves) {
          const w = measureM(s.label);
          if (fx + w > g.right) { fx = g.colL; fy += 8; }
          if (s.id === shelf.id) { marker(Math.max(0, fx - 4), fy + 1); stamp(s.label, fx, fy, 1, undefined, true); }
          else stamp(s.label, fx, fy, 1, "BOOKS:SHELF:" + s.id + ":1", true);
          fx += w + 8;
        }
        const top = fy + 11;
        const perCol = Math.max(3, Math.floor((limit - top) / 8));
        const nCols = g.wide ? 2 : 1;
        const per = perCol * nCols;
        const total = Math.max(1, Math.ceil(shelf.books.length / per));
        const n = Math.min(Math.max(1, parseInt(parts[3] || "1", 10) || 1), total);
        currentPage = "BOOKS:SHELF:" + shelf.id + ":" + n; // clamp the route to reality
        const slice = shelf.books.slice((n - 1) * per, n * per);
        const gut = 10;
        const colW = Math.floor((g.right - g.colL - gut * (nCols - 1)) / nCols);
        slice.forEach((b, i) => {
          const x = g.colL + Math.floor(i / perCol) * (colW + gut);
          const y = top + (i % perCol) * 8;
          const rw = b.rating ? b.rating * 4 - 2 : 0;
          let t = cleanB(b.title, true);
          while (t && measureM(t) > colW - rw - 6) t = t.slice(0, -1).trimEnd();
          stamp(t, x, y, 1, "BOOKS:BOOK:" + b.slug, true);
          if (b.status === "reading") marker(Math.max(0, x - 4), y + 1);
          if (b.rating) stampRatingN(x + colW - rw, y + 1, b.rating);
        });
        // the rail: flick through pages (arrow keys work too)
        if (total > 1) {
          const pr = limit + 3;
          let px2 = g.colL;
          if (n > 1) stamp("PREV", px2, pr, 1, "BOOKS:SHELF:" + shelf.id + ":" + (n - 1), true, true);
          px2 += measureM("PREV") + 6;
          stamp(n + "/" + total, px2, pr, 1, undefined, true);
          px2 += measureM(n + "/" + total) + 6;
          if (n < total) stamp("NEXT", px2, pr, 1, "BOOKS:SHELF:" + shelf.id + ":" + (n + 1), true, true);
        }
        return;
      }
      // a single book: the title IS the cover
      const slug = parts[2];
      const book = BOOKS_DATA.find((b) => b.slug === slug);
      if (!book) { stamp("BOOKS", g.colL, g.titleTop, 2, undefined, false, true); return; }
      let r = g.titleTop;
      for (const line of wrap(cleanB(book.title), 2, Math.round(cols * (g.wide ? 0.7 : 0.88))).slice(0, 2)) {
        stamp(line, g.colL, r, 2);
        r += 16;
      }
      stamp(cleanB(book.author, true), g.colL, r, 1, undefined, true);
      r += 8;
      if (book.rating) { stampRating(g.colL, r, book.rating); r += 6; }
      const statusLbl = book.status === "tbr" ? "TO BE READ" : book.status === "reading" ? "NOW READING" : "READ";
      stamp(statusLbl, g.colL, r, 1, undefined, true);
      r += 10;
      const revLines = book.review ? wrap(cleanB(book.review), 1, Math.round(cols * (g.wide ? 0.55 : 0.85))) : [];
      const per = Math.max(1, Math.floor((limit - r) / 9));
      const totalR = Math.max(1, Math.ceil(revLines.length / per));
      const nR = Math.min(Math.max(1, parseInt(parts[3] || "1", 10) || 1), totalR);
      currentPage = "BOOKS:BOOK:" + slug + (nR > 1 ? ":" + nR : "");
      for (const line of revLines.slice((nR - 1) * per, nR * per)) {
        stamp(line, g.colL, r, 1);
        r += 9;
      }
      const pr = limit + 3;
      let px2 = g.colL;
      stamp("BOOKS", px2, pr, 1, "BOOKS", true, true);
      px2 += measureM("BOOKS") + 8;
      if (book.url) {
        EXTERNAL.GOODREADS = book.url;
        stamp("GOODREADS", px2, pr, 1, "GOODREADS", true, true);
        px2 += measureM("GOODREADS") + 8;
      }
      if (totalR > 1) {
        if (nR > 1) { stamp("PREV", px2, pr, 1, "BOOKS:BOOK:" + slug + ":" + (nR - 1), true, true); }
        px2 += measureM("PREV") + 6;
        stamp(nR + "/" + totalR, px2, pr, 1, undefined, true);
        px2 += measureM(nR + "/" + totalR) + 6;
        if (nR < totalR) stamp("NEXT", px2, pr, 1, "BOOKS:BOOK:" + slug + ":" + (nR + 1), true, true);
      }
    }

    /* ---------- pages: fixed rail on every page; content fills the field ---------- */
    function compose(page: string) {
      sctx.fillStyle = "#000"; sctx.fillRect(0, 0, SW, SH);
      hots.innerHTML = "";
      links = [];
      textMask = new Uint8Array(cols * rows);
      slashLine = null; faceBox = null;
      if (page !== "HOME") { laserOn = false; laserP = 0; laserMask = null; }
      const wide = W / H > 1.05;

      if (wide) {
        const colL = Math.round(cols * 0.06);
        const right = Math.round(cols * 0.94);
        const titleTop = Math.round(rows * 0.13);
        const contentTop = titleTop + 27;
        // the menu lives on the top line of every page; a lit block marks the current page,
        // so the sliding underline belongs to hover alone
        {
          const gap = 6;
          const total = NAV.reduce((s, w) => s + measureM(w) + gap, 0) - gap;
          let nx = right - total;
          const menuRow = nx < colL + 23 ? 12 : 3; // drop below KJEL. if the board is narrow
          for (const wd of NAV) {
            const here = wd === page || (wd === "BOOKS" && page.startsWith("BOOKS"));
            if (here) { marker(nx - 4, menuRow + 1); stamp(wd, nx, menuRow, 1, undefined, true); }
            else stamp(wd, nx, menuRow, 1, wd, true);
            nx += measureM(wd) + gap;
          }
        }
        if (page === "HOME") {
          const cap = Math.min(H * 0.26, (W * 0.5) / 2.9);
          slashLine = drawMark(cap, colL * cw, H * 0.4);
          // the portrait holds the upper-right, where the little theater played
          drawFace(W * 0.785, H * 0.375, 0.56);
          // click the portrait: the eyes go laser (a dot-board rendition of the meme)
          hotAt(faceBox!.x0 * cw, faceBox!.y0 * chh, (faceBox!.x1 - faceBox!.x0) * cw, (faceBox!.y1 - faceBox!.y0) * chh,
            "portrait", () => { laserOn = !laserOn; if (laserOn) buildLaser(); });
          if (laserOn) buildLaser();
          // an honest introduction, in the small face; it stays clear of the portrait
          const mIntro = Math.min(Math.round(cols * 0.7), Math.floor(faceBox!.x0) - colL - 4);
          let irow = Math.round(rows * 0.5);
          for (const para of TXT.home) {
            for (const line of wrapM(para, mIntro)) {
              if (irow + 5 > rows - 24) break;
              stamp(line, colL, irow, 1, undefined, true);
              irow += 8;
            }
            irow += 4;
          }
        } else if (page.startsWith("BOOKS")) {
          stamp("KJEL.", colL, 3, 1, "HOME", true);
          composeBooks(page, { colL, titleTop, contentTop, right: Math.round(cols * 0.94), wide: true });
        } else {
          stamp("KJEL.", colL, 3, 1, "HOME", true);
          stamp(page, colL, titleTop, 2, undefined, false, true); // the page word, quietly underlined
        }
        // the house column: single left datum; the sides stay free
        const contentCol = colL;
        const measure = Math.round(cols * 0.55);
        const flow = (lines: string[], m?: number, stop?: number, bullets?: boolean) => {
          let crow = contentTop;
          const lim = stop || rows - 16;
          let head = true; // the first line of each item takes the strike bullet
          for (const raw of lines) {
            if (!raw) { crow += 9; head = true; continue; }
            for (const line of wrap(raw, 1, m || measure)) {
              if (crow + 7 > lim) return crow;
              if (bullets && head) { stampG(DS.SOLIDUS, contentCol, crow); head = false; }
              stamp(line, bullets ? contentCol + 8 : contentCol, crow, 1);
              crow += 9;
            }
          }
          return crow;
        };
        if (page === "ABOUT") {
          // place + contact anchor the lower-left corner
          stamp(TXT.place, colL, rows - 19, 1);
          stamp("LINKEDIN", colL, rows - 10, 1, "LINKEDIN", true, true);
          stamp("EMAIL", colL + measureM("LINKEDIN") + 6, rows - 10, 1, "EMAIL", true, true);
          // work leads; hobbies follow
          flow(TXT.about, measure, rows - 21);
        } else if (page !== "HOME" && !page.startsWith("BOOKS")) {
          const end = flow(PAGES[page] || [], undefined, undefined, page === "WORK");
          if (page === "NOTES") stampSmiley(contentCol + 14, end + 20, 13, true);
        }
      } else {
        const colL = 3;
        // menu on top, wrapped in fixed slots; a lit block marks the current page
        let nx = colL, ny = 13;
        for (const wd of NAV) {
          const wc = measureM(wd);
          if (nx + wc > cols - 3) { nx = colL; ny += 9; }
          const here = wd === page || (wd === "BOOKS" && page.startsWith("BOOKS"));
          if (here) { marker(Math.max(0, nx - 4), ny + 1); stamp(wd, nx, ny, 1, undefined, true); }
          else stamp(wd, nx, ny, 1, wd, true);
          nx += wc + 6;
        }
        const titleTop = ny + 14;
        const contentTop = titleTop + 21; // title cap + one body cap of air
        if (page === "HOME") {
          const cap = Math.min(H * 0.14, (W * 0.88) / 2.9);
          slashLine = drawMark(cap, colL * cw, (titleTop + 21) * chh);
          let irow = titleTop + 41;
          for (const para of TXT.homeNarrow) {
            for (const line of wrapM(para, cols - colL * 2)) {
              stamp(line, colL, irow, 1, undefined, true);
              irow += 8;
            }
            irow += 4;
          }
          } else if (page.startsWith("BOOKS")) {
          stamp("KJEL.", colL, 3, 1, "HOME", true);
          composeBooks(page, { colL, titleTop, contentTop, right: cols - 3, wide: false });
        } else {
          stamp("KJEL.", colL, 3, 1, "HOME", true);
          stamp(page, colL, titleTop, 2, undefined, false, true);
        }
        if (page === "ABOUT") {
          const bio = TXT.aboutNarrow;
          const linksRow = rows - 10, placeRow = rows - 19;
          let crow = contentTop;
          for (const line of bio) {
            if (!line) { crow += 9; continue; }
            if (crow + 7 > placeRow - 2) break;
            stamp(line, colL, crow, 1);
            crow += 9;
          }
          stamp(TXT.placeNarrow, colL, placeRow, 1);
          stamp("LINKEDIN", colL, linksRow, 1, "LINKEDIN", true, true);
          stamp("EMAIL", colL + measureM("LINKEDIN") + 6, linksRow, 1, "EMAIL", true, true);
        } else if (page !== "HOME" && !page.startsWith("BOOKS")) {
          let crow = contentTop;
          let head = true;
          const bullets = page === "WORK";
          for (const raw of PAGES[page] || []) {
            if (!raw) { crow += 9; head = true; continue; }
            for (const line of wrap(raw, 1, cols - colL * 2 - (bullets ? 8 : 0))) {
              if (crow + 7 > rows - 6) break;
              if (bullets && head) { stampG(DS.SOLIDUS, colL, crow); head = false; }
              stamp(line, bullets ? colL + 8 : colL, crow, 1);
              crow += 9;
            }
          }
          if (page === "NOTES" && crow + 30 < rows - 6) stampSmiley(colL + 12, crow + 16, 11, true);
        }
      }
      haloPass();

      cellLum = rasterToCells();

      // slash lane through the J: a permanent cut, like the mark
      slashParam = null;
      const sl = slashLine;
      if (sl) {
        slashParam = new Float32Array(cols * rows).fill(NaN);
        slashD = new Float32Array(cols * rows);
      slashD = new Float32Array(cols * rows);
        const ax = sl.ax / cw, ay = sl.ay / chh;
        const bx = sl.bx / cw, by = sl.by / chh;
        const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const t = ((x - ax) * dx + (y - ay) * dy) / len2;
          if (t < 0 || t > 1) continue;
          const px = ax + t * dx, py = ay + t * dy;
          const ddx = x - px, ddy = y - py;
          const d2v = ddx * ddx + ddy * ddy;
          if (d2v < 3.6) { slashParam[y * cols + x] = t; slashD[y * cols + x] = d2v; }
        }
      }

      // where cursor guides may draw: only the true void, 2 dots clear of any content
      let content = new Uint8Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) content[i] = cellLum[i] > 0.3 || textMask![i] >= 2 ? 1 : 0;
      for (let p = 0; p < 2; p++) {
        const d2 = Uint8Array.from(content);
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          if (content[y * cols + x]) continue;
          for (let dy = -1; dy <= 1 && !d2[y * cols + x]; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && xx < cols && yy >= 0 && yy < rows && content[yy * cols + xx]) { d2[y * cols + x] = 1; break; }
          }
        }
        content = d2;
      }
      guideOK = new Uint8Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) guideOK[i] = content[i] ? 0 : 1;
      wake(); // a fresh composition always earns frames to flip in
      dirtyTargets = true;
    }

    const hashFor = (page: string) => {
      if (page === "HOME") return "#";
      if (page.startsWith("BOOKS:")) {
        const p = page.split(":");
        return "#books/" + p[2] + (p[3] && p[3] !== "1" ? "/" + p[3] : "");
      }
      return "#" + page.toLowerCase();
    };
    function pageFromHash(): string {
      let h = "";
      try { h = decodeURIComponent(location.hash.slice(1)).toLowerCase(); } catch { h = location.hash.slice(1).toLowerCase(); }
      if (!h) return "HOME";
      if (h === "books") return "BOOKS";
      if (h.startsWith("books/")) {
        const p = h.split("/");
        if (bookShelves().some((s) => s.id === p[1])) return "BOOKS:SHELF:" + p[1] + ":" + (p[2] || "1");
        return "BOOKS:BOOK:" + p[1] + (p[2] ? ":" + p[2] : "");
      }
      const up = h.toUpperCase();
      return NAV.includes(up) ? up : "HOME";
    }

    function navigate(page: string, skipHash?: boolean) {
      if (page === currentPage) return;
      currentPage = page;
      if (!skipHash) {
        try { history.pushState(null, "", hashFor(page)); } catch {}
      }
      prevLum = cellLum; prevMask = textMask;
      compose(page);
      if (!reduced) transStart = performance.now() / 1000;
    }

    // cached dot sprites: one anti-aliased ellipse rendered once per resize,
    // then blitted per dot — drawImage is several times cheaper than a path
    // fill, which is what keeps the finer grids at 60fps.
    let dotSprites: { on: HTMLCanvasElement; off: HTMLCanvasElement; heat: HTMLCanvasElement[] } | null = null;
    function makeDot(color: string) {
      const c = document.createElement("canvas");
      c.width = Math.max(2, Math.ceil(cw * 0.84 * dpr));
      c.height = Math.max(2, Math.ceil(chh * 0.84 * dpr));
      const g = c.getContext("2d")!;
      g.fillStyle = color;
      g.beginPath();
      g.ellipse(c.width / 2, c.height / 2, c.width / 2, c.height / 2, 0, 0, Math.PI * 2);
      g.fill();
      return c;
    }
    function buildSprites() {
      dotSprites = { on: makeDot(ON), off: makeDot(OFF), heat: HEAT.map(makeDot) };
    }

    function buildOffLayer() {
      offLayer.width = canvas.width; offLayer.height = canvas.height;
      const octx = offLayer.getContext("2d")!;
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.fillStyle = BG; octx.fillRect(0, 0, W, H);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        octx.drawImage(dotSprites!.off, x * cw + cw * 0.08, y * chh + chh * 0.08, cw * 0.84, chh * 0.84);
      }
      staticLayer.width = offLayer.width; staticLayer.height = offLayer.height;
      stx = staticLayer.getContext("2d")!;
      stx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stx.drawImage(offLayer, 0, 0, W, H);
    }

    // a dot lands: stamp its final state into the latched image (exact cell
    // rect — no bleed, so neighbors in the static layer are never nicked)
    function stampStatic(x: number, y: number, on: boolean) {
      if (!stx) return;
      stx.fillStyle = BG;
      stx.fillRect(x * cw, y * chh, cw, chh);
      stx.drawImage(on ? dotSprites!.on : dotSprites!.off,
        x * cw + cw * 0.08, y * chh + chh * 0.08, cw * 0.84, chh * 0.84);
    }

    function resize() {
      W = Math.max(1, window.innerWidth); H = Math.max(1, window.innerHeight);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // one fixed resolution per orientation, like a real sign: the row count is
      // constant and the dot size fluid, so the composition reads identically on
      // every screen — a 4K monitor just stands closer to the same board.
      // cols follow the aspect ratio to keep the dots round.
      rows = Math.round((W / H > 1.05 ? 141 : 153) * density);
      cols = Math.max(8, Math.round(rows * (W / H)));
      cw = W / cols; chh = H / rows;
      // the sampling cap scales with density so the portrait keeps a constant
      // ~4.4 source px per cell no matter how fine the grid gets
      K = Math.min(1, (1100 * density) / Math.max(W, H));
      SW = Math.max(8, Math.round(W * K)); SH = Math.max(8, Math.round(H * K));
      K = SW / W;
      src.width = SW; src.height = SH;
      dotV = new Float32Array(cols * rows).fill(0);
      heat = new Float32Array(cols * rows);
      trailV = new Float32Array(cols * rows);
      targets = new Uint8Array(cols * rows);
      activeIdx = new Int32Array(cols * rows);
      activeN = 0; trailAlive = false; dirtyTargets = true;
      prevLum = null; prevMask = null; transStart = -1;
      clockMask = new Uint8Array(cols * rows); lastClockKey = "";
      playMask = new Uint8Array(cols * rows); lastPlayKey = "";
      buildSprites();
      buildOffLayer();
      compose(currentPage);
    }

    /* ---------- now listening: the board announces what's playing ---------- */
    let nowTitle = "", nowArtist = "", nowUrl = "";
    // the title is a link out to the song; same slide-under affordance as nav links
    let nowLink: { col: number; row: number; wCols: number; hover: boolean; hoverP: number } | null = null;
    let nowHot: HTMLAnchorElement | null = null;
    async function pollNow() {
      try {
        const res = await fetch("/api/now", { cache: "no-store" });
        if (!res.ok) return;
        const d = await res.json();
        nowTitle = d?.listening?.title || "";
        nowArtist = d?.listening?.subtitle || "";
        nowUrl = d?.listening?.url || "";
      } catch {
        /* the board just stays quiet */
      }
    }
    pollNow();
    const nowTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") pollNow();
    }, 45_000);

    /* ---------- the clock + the role line, one dynamic text layer ---------- */
    let clockMask: Uint8Array | null = null, lastClockKey = "";
    // a 1-dot dark ring around clock-layer text so it reads over the portrait
    let clockHalo: Uint8Array | null = null;

    function rebuildClockHalo() {
      const cm = clockMask!;
      const halo = new Uint8Array(cols * rows);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (!cm[y * cols + x]) continue;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && xx < cols && yy >= 0 && yy < rows && !cm[yy * cols + xx])
            halo[yy * cols + xx] = 1;
        }
      }
      clockHalo = halo;
    }

    function stampMask(text: string, col: number, row: number, scale: number) {
      const cm = clockMask!;
      let cx = col;
      for (const ch of text.toUpperCase()) {
        const g = glyph(ch), gw = g[0].length;
        for (let r = 0; r < 7; r++) for (let c = 0; c < gw; c++) {
          if (g[r][c] !== "1") continue;
          for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
            const yy = row + r * scale + sy, xx = cx + c * scale + sx;
            if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) cm[yy * cols + xx] = 1;
          }
        }
        cx += (gw + 1) * scale;
      }
    }

    function stampMaskM(text: string, col: number, row: number) {
      const cm = clockMask!;
      let cx = col;
      for (const ch of text.toUpperCase()) {
        const g = glyphM(ch), gw = g[0].length;
        for (let r = 0; r < 5; r++) for (let c = 0; c < gw; c++) {
          if (g[r][c] !== "1") continue;
          const yy = row + r, xx = cx + c;
          if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) cm[yy * cols + xx] = 1;
        }
        cx += gw + 1;
      }
    }

    // the announcement: label, title (and artist when full) stacked from topRow;
    // "left" starts lines at anchorX, "center" centers them on it.
    function stampNow(mode: "left" | "center" | "right", anchorX: number, topRow: number, maxW: number, ss: number, full: boolean): boolean {
      const logo = DS.SPOTIFY, lw = logo[0].length, lPad = lw + 3;
      const clean = (s: string, micro: boolean, budget: number) => {
        let out = "";
        for (const ch of s.toUpperCase()) if ((micro ? F3 : F)[ch] || ch === " ") out += ch;
        out = out.replace(/\s+/g, " ").trim();
        while (out && (micro ? measureM(out) : measureCols(out)) > budget) out = out.slice(0, -1).trimEnd();
        return out;
      };
      const ttl = clean(nowTitle, false, maxW - lPad);
      if (!ttl) { clearNowHot(); return false; }
      const art = full ? clean(nowArtist, true, maxW) : "";
      const label = "NOW LISTENING";
      const px = (w: number) =>
        mode === "left" ? anchorX : mode === "right" ? anchorX - w : Math.round(anchorX - w / 2);
      const lx = px(measureM(label));
      stampMaskM(label, lx, topRow);
      // the on-air dot, beating with the seconds, hung in the margin
      if (reduced || ss % 2 === 0) {
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const yy = topRow + 1 + dy, xx = lx - 5 + dx;
          if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) clockMask![yy * cols + xx] = 1;
        }
      }
      const tw = measureCols(ttl), total = lPad + tw;
      const bx = mode === "left" ? anchorX : mode === "right" ? anchorX - total : Math.round(anchorX - total / 2);
      const tx = bx + lPad, ty = topRow + 8;
      // the spotify mark, dot-for-dot, beside the title
      for (let r = 0; r < logo.length; r++) for (let c = 0; c < lw; c++) {
        if (logo[r][c] !== "1") continue;
        const yy = ty - 1 + r, xx = bx + c;
        if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) clockMask![yy * cols + xx] = 1;
      }
      stampMask(ttl, tx, ty, 1);
      if (art) stampMaskM(art, px(measureM(art)), topRow + 17);
      if (nowUrl) {
        if (!nowLink) nowLink = { col: tx, row: topRow + 8, wCols: tw, hover: false, hoverP: 0 };
        else { nowLink.col = tx; nowLink.row = topRow + 8; nowLink.wCols = tw; }
        if (!nowHot || !nowHot.isConnected) {
          nowHot = document.createElement("a");
          nowHot.className = "fd-hot";
          nowHot.target = "_blank"; nowHot.rel = "noreferrer";
          nowHot.setAttribute("aria-label", "open the song on spotify");
          nowHot.addEventListener("mouseenter", () => { if (nowLink) { nowLink.hover = true; wake(); } });
          nowHot.addEventListener("mouseleave", () => { if (nowLink) { nowLink.hover = false; wake(); } });
          hots.appendChild(nowHot);
        }
        nowHot.href = nowUrl;
        const hw = Math.max(44, total * cw + 12), hh2 = Math.max(44, 9 * chh + 12);
        nowHot.style.left = `${bx * cw + (total * cw) / 2 - hw / 2}px`;
        nowHot.style.top = `${(ty - 1) * chh + (9 * chh) / 2 - hh2 / 2}px`;
        nowHot.style.width = `${hw}px`;
        nowHot.style.height = `${hh2}px`;
      } else clearNowHot();
      return true;
    }

    function clearNowHot() {
      if (nowHot && nowHot.isConnected) nowHot.remove();
      nowHot = null; nowLink = null;
    }

    function updateClock(t: number) {
      if (!clockMask) return;
      const fi = reduced ? 0 : Math.floor(t / 2.8) % ROLES.length;
      const key = currentPage + "|" + ((Date.now() / 1000) | 0) + "|" + fi + "|" + nowTitle;
      if (key === lastClockKey) return;
      lastClockKey = key;
      clockMask.fill(0);
      const d = new Date();
      const wide = W / H > 1.05;
      const hh = d.getHours(), mm = d.getMinutes(), ss = d.getSeconds();
      const hhs = String(hh).padStart(2, "0"), mms = String(mm).padStart(2, "0");
      if (currentPage !== "HOME") {
        clearNowHot(); // the announcement lives on home only
        // the board keeps its heartbeat on subpages
        if (!wide) return;
        const r2 = Math.round(cols * 0.94);
        const mmX = r2 - measureCols(mms);
        stampMask(mms, mmX, rows - 13, 1);
        const cX = mmX - 3;
        if (reduced || ss % 2 === 0) stampMask(":", cX, rows - 13, 1);
        stampMask(hhs, cX - 2 - measureCols(hhs), rows - 13, 1);
        rebuildClockHalo();
        return;
      }
        const dateStr =
        DAYS[d.getDay()] + " " + String(d.getDate()).padStart(2, "0") + " " + MONTHS[d.getMonth()];
      if (wide) {
        // the clock honors the same 0.94 frame as the rest of the board
        const s = 2;
        const right = Math.round(cols * 0.94);
        const col0 = right - 25 * s;
        const row0 = rows - 27;
        // while music plays the song takes the role slot — one corner, one voice
        const played = stampNow("right", right, row0 - 18, Math.round(cols * 0.45), ss, false);
        if (!played) {
          const role = ROLES[fi];
          stampMask(role, right - measureCols(role), row0 - 10, 1);
        }
        stampMask(hhs, col0, row0, s);
        if (reduced || ss % 2 === 0) stampMask(":", col0 + 12 * s, row0, s);
        stampMask(mms, col0 + 14 * s, row0, s);
        const dw = measureCols(dateStr);
        stampMask(dateStr, right - dw, row0 + 7 * s + 3, 1);
      } else {
        const total = 50;
        const col0 = Math.round((cols - total) / 2);
        const row0 = rows - 40;
        const role = ROLES[fi];
        stampMask(role, Math.round((cols - measureCols(role)) / 2), row0 - 10, 1);
        stampMask(hhs, col0, row0, 2);
        if (reduced || ss % 2 === 0) stampMask(":", col0 + 24, row0, 2);
        stampMask(mms, col0 + 28, row0, 2);
        const dw = measureCols(dateStr);
        stampMask(dateStr, Math.round((cols - dw) / 2), row0 + 17, 1);
        if (row0 - 28 > Math.round(rows * 0.56))
          stampNow("center", Math.round(cols / 2), row0 - 28, cols - 8, ss, false);
      }
      rebuildClockHalo();
    }

    /* ---------- the resident layer: a glider on subpages, the cyclist lapping home ---------- */
    let playMask: Uint8Array | null = null, lastPlayKey = "";
    // the colophon: a lone glider walking a small torus beside the title on subpages
    let colA: Uint8Array | null = null, colGen = 0, colSeed = "";

    function updatePlay(t: number) {
      if (!playMask) return;
      const wide = W / H > 1.05;
      if (currentPage !== "HOME" && wide && !reduced) {
        const G = 9;
        const gen = Math.floor(t / 1.4);
        const key = "col|" + currentPage + "|" + gen;
        if (key === lastPlayKey) return;
        lastPlayKey = key;
        playMask.fill(0);
        if (!colA || colSeed !== currentPage) {
          colA = new Uint8Array(G * G);
          for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++)
            if (DS.GLIDER[y][x] === "1") colA[(y + 1) * G + (x + 1)] = 1;
          colSeed = currentPage; colGen = gen;
        }
        while (colGen < gen) {
          const cur: Uint8Array = colA!;
          const nb = new Uint8Array(G * G);
          for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
            let c = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              c += cur[((y + dy + G) % G) * G + ((x + dx + G) % G)];
            }
            nb[y * G + x] = (cur[y * G + x] ? c === 2 || c === 3 : c === 3) ? 1 : 0;
          }
          colA = nb; colGen++;
        }
        const ox = Math.round(cols * 0.94) - G, oy = Math.round(rows * 0.13);
        for (let y = 0; y < G; y++) for (let x = 0; x < G; x++)
          if (colA![y * G + x]) {
            const xx = ox + x, yy = oy + y;
            if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) playMask[yy * cols + xx] = 1;
          }
        return;
      }
      const on = currentPage === "HOME" && wide && !reduced;
      if (!on) {
        if (lastPlayKey !== "off") { lastPlayKey = "off"; playMask.fill(0); }
        return;
      }
      // the cyclist: endless laps along the bottom edge, passing behind the text;
      // phase-shifted so he's already riding in as the board boots
      const lap = cols + 48;
      const xo = (Math.floor(t * 8.5) + 30) % lap - 38;
      const ped = Math.floor(t * 4) % 2;
      const key = "cyc|" + xo + "|" + ped;
      if (key === lastPlayKey) return;
      lastPlayKey = key;
      playMask.fill(0);
      const yb = rows - 17;
      const put = (x: number, y: number) => {
        const xi = Math.round(x), yi = Math.round(y);
        if (xi >= 0 && xi < cols && yi >= 0 && yi < rows) playMask![yi * cols + xi] = 1;
      };
      const line = (x0: number, y0: number, x1: number, y1: number) => {
        const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
        for (let i = 0; i <= n; i++) put(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n);
      };
      const circ = (cx: number, cy: number, r: number) => {
        const n = Math.max(8, Math.round(r * 7));
        for (let a = 0; a < n; a++) {
          const th = (a / n) * Math.PI * 2;
          put(cx + Math.cos(th) * r, cy + Math.sin(th) * r);
        }
      };
      circ(xo + 4, yb + 10, 3); circ(xo + 19, yb + 10, 3);
      line(xo + 5, yb + 10, xo + 11, yb + 11);
      line(xo + 11, yb + 11, xo + 9, yb + 6);
      put(xo + 8, yb + 5); put(xo + 9, yb + 5);
      line(xo + 11, yb + 11, xo + 17, yb + 7);
      line(xo + 17, yb + 7, xo + 19, yb + 10);
      put(xo + 17, yb + 6); put(xo + 18, yb + 6);
      line(xo + 9, yb + 5, xo + 13, yb + 2);
      put(xo + 14, yb); put(xo + 15, yb); put(xo + 14, yb + 1); put(xo + 15, yb + 1);
      line(xo + 13, yb + 3, xo + 16, yb + 6);
      const p1 = ped ? [xo + 11, yb + 9] : [xo + 13, yb + 11];
      const p2 = ped ? [xo + 11, yb + 13] : [xo + 9, yb + 11];
      line(xo + 9, yb + 6, p1[0], p1[1]);
      line(xo + 9, yb + 6, p2[0], p2[1]);
      // behind the text: the rider yields to the clock, role, and date
      if (clockMask) {
        for (let y = Math.max(0, yb - 2); y < Math.min(rows, yb + 16); y++)
          for (let x = Math.max(0, xo - 2); x < Math.min(cols, xo + 25); x++) {
            const i = y * cols + x;
            if (!playMask[i]) continue;
            let near = false;
            for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx, yy = y + dy;
              if (xx >= 0 && xx < cols && yy >= 0 && yy < rows && clockMask[yy * cols + xx]) { near = true; break; }
            }
            if (near) playMask[i] = 0;
          }
      }
    }

    /* ---------- the board ---------- */
    let mx = -1e4, my = -1e4, pmx = -1e4, pmy = -1e4;
    let cursorMode = 1; // C cycles: 0 none · 1 trail (default) · 2 guides
    let trailV: Float32Array | null = null;
    let heat = new Float32Array(0);
    let raf = 0;
    // bistability: a real flip-dot board is magnetically latched — it holds its
    // image for free and only spends energy flipping. Same here: the loop draws
    // only while something is in motion; at rest the canvas simply holds. The
    // clock's second-blink wakes it briefly each second; wake() buys frames.
    let awake = 30;
    const wake = () => { awake = 2; };
    let fdTicks = 0, fdDrawn = 0; // debug counters: canvas data-fd = drawn/ticks
    // target cache + active list: steady frames touch only the dots in motion.
    // Anything that can change a dot's target (compose, clock/play tick, wipe,
    // shimmer, cursor, trail) marks targets dirty and forces one full scan —
    // and the clock dirties every second anyway, so staleness self-heals fast.
    let targets = new Uint8Array(0);
    let activeIdx = new Int32Array(0);
    let activeN = 0;
    let trailAlive = false;
    let dirtyTargets = true;
    const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2);

    function frame(ms: number) {
      const t = ms / 1000;
      const ck = lastClockKey, pk = lastPlayKey;
      updateClock(t);
      updatePlay(t);
      // anything that changed state this tick keeps the board awake; anything
      // that can move a dot's target also invalidates the target cache
      if (ck !== lastClockKey || pk !== lastPlayKey) { wake(); dirtyTargets = true; }
      if (transStart >= 0) { wake(); dirtyTargets = true; }
      if (!reduced && faceBox) { wake(); dirtyTargets = true; } // shimmer never rests
      if (trailAlive) { wake(); dirtyTargets = true; }
      if (laserOn || laserP > 0.02) wake();
      fdTicks++;
      if (fdTicks % 15 === 0) canvas.dataset.fd = fdDrawn + "/" + fdTicks;
      if (awake <= 0) { raf = requestAnimationFrame(frame); return; }
      awake--; fdDrawn++;
      let motion = false;
      const inTrans = transStart >= 0 && t - transStart < TRANS;
      if (transStart >= 0 && !inTrans) { transStart = -1; prevLum = null; prevMask = null; }
      const sweep = inTrans ? easeInOut((t - transStart) / TRANS) * (cols + 10) : 0;

      ctx.drawImage(staticLayer, 0, 0, W, H);

      const curCol = Math.floor(mx / cw), curRow = Math.floor(my / chh);
      const fullScan = dirtyTargets;
      if (fullScan && !reduced && cursorMode === 1 && trailV && mx > -9999) {
        if (Math.hypot(mx - pmx, my - pmy) > 300 || pmx < -9999) { pmx = mx; pmy = my; }
        const x0 = pmx / cw, y0 = pmy / chh, x1 = mx / cw, y1 = my / chh;
        const steps = Math.min(80, Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))));
        for (let s = 0; s <= steps; s++) {
          const fx = Math.round(x0 + ((x1 - x0) * s) / steps), fy = Math.round(y0 + ((y1 - y0) * s) / steps);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = fx + dx, yy = fy + dy;
            if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) {
              const w2 = 1 - (Math.abs(dx) + Math.abs(dy)) * 0.3;
              const ii = yy * cols + xx;
              if (trailV[ii] < w2) trailV[ii] = w2;
            }
          }
        }
      }
      pmx = mx; pmy = my;

      const CL = cellLum!, TM = textMask!;
      if (fullScan) {
        dirtyTargets = false;
        let anyTrail = false;
        activeN = 0;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const useOld = inTrans && prevLum !== null && x + hash2(x, y) * 8 > sweep;
        const L = useOld ? prevLum! : CL;
        const M = useOld ? prevMask : TM;
        const m = M ? M[i] : 0;
        let target: number;
        const sp = !useOld && slashParam ? slashParam[i] : NaN;
        if (m >= 2) target = 1;
        else if (m === 1) target = 0;
        else if (!useOld && ((clockMask && clockMask[i]) || (playMask && playMask[i]))) {
          target = 1; // dynamic layers: the clock, the glider, the cyclist
        } else if (sp === sp) {
          // the slash: a solid lit core with a dark channel cut around it
          target = slashD![i] < 1 ? 1 : 0;
        } else {
          // fixed threshold — typography never moves; only the portrait keeps its shimmer
          let thr = 0.42;
          if (!reduced && !useOld && faceBox && x > faceBox.x0 && x < faceBox.x1 && y > faceBox.y0 && y < faceBox.y1) {
            thr = 0.42 + 0.06 * Math.sin(t * 0.5 - x * 0.13 - y * 0.09);
          }
          target = L[i] > thr ? 1 : 0;
          if (target && !useOld && clockHalo && clockHalo[i]) target = 0;
        }
        // cursor layers (C toggles) — stamped text is untouchable; guides live in the void only
        if (trailV && trailV[i] > 0) {
          trailV[i] *= 0.9;
          if (trailV[i] < 0.02) trailV[i] = 0; else { anyTrail = true; motion = true; }
          if (!reduced && cursorMode === 1 && m === 0 && trailV[i] > 0.25) target = 1;
        }
        if (!reduced && cursorMode === 2 && m === 0 && guideOK && guideOK[i] && mx > -9999 &&
            (x === curCol || y === curRow) && (x + y) % 3 === 0) {
          target = 1;
        }
        targets[i] = target;
        const pv = dotV[i];
        dotV[i] += (target - dotV[i]) * (reduced ? 1 : 0.38);
        // latch: once the flip lands the dot snaps exact, is stamped into the
        // static layer, and stops costing anything at all
        if (Math.abs(target - dotV[i]) > 0.004) motion = true;
        else if (dotV[i] !== target) { dotV[i] = target; stampStatic(x, y, target > 0.5); }
        const v = dotV[i];
        if (!reduced) {
          if (pv > 0.5 && v <= 0.5) heat[i] = 1;
          else if (heat[i] > 0.02) heat[i] *= 0.96;
          else heat[i] = 0;
          if (heat[i] > 0.02) motion = true;
        }
        if (v !== target || (!reduced && heat[i] > 0.02)) activeIdx[activeN++] = i;
        // latched and cold: the static layer blit already shows this dot
        if (pv === target && v === target && (reduced || heat[i] <= 0.02)) continue;
        if (v <= 0.04) {
          // afterglow: thermal mass — the dot cools instead of snapping cold
          if (!reduced && heat[i] > 0.02) {
            ctx.fillStyle = BG;
            ctx.fillRect(x * cw - 0.5, y * chh - 0.5, cw + 1, chh + 1);
            ctx.drawImage(dotSprites!.heat[Math.min(7, (heat[i] * 8) | 0)],
              x * cw + cw * 0.08, y * chh + chh * 0.08, cw * 0.84, chh * 0.84);
          }
          continue;
        }
        ctx.fillStyle = BG;
        ctx.fillRect(x * cw - 0.5, y * chh - 0.5, cw + 1, chh + 1);
        const sx = Math.abs(2 * v - 1);
        if (sx < 0.03) continue;
        ctx.drawImage(v > 0.5 ? dotSprites!.on : dotSprites!.off,
          x * cw + cw / 2 - cw * 0.42 * sx, y * chh + chh * 0.08, cw * 0.84 * sx, chh * 0.84);
        }
        trailAlive = anyTrail;
      } else {
        // fast path: only the dots still in motion, against cached targets
        let w = 0;
        for (let k = 0; k < activeN; k++) {
          const i = activeIdx[k];
          const x = i % cols, y = (i / cols) | 0;
          const target = targets[i];
          const pv = dotV[i];
          dotV[i] += (target - dotV[i]) * (reduced ? 1 : 0.38);
          if (Math.abs(target - dotV[i]) > 0.004) motion = true;
          else if (dotV[i] !== target) { dotV[i] = target; stampStatic(x, y, target > 0.5); }
          const v = dotV[i];
          if (!reduced) {
            if (pv > 0.5 && v <= 0.5) heat[i] = 1;
            else if (heat[i] > 0.02) heat[i] *= 0.96;
            else heat[i] = 0;
            if (heat[i] > 0.02) motion = true;
          }
          if (v !== target || (!reduced && heat[i] > 0.02)) activeIdx[w++] = i;
          if (pv === target && v === target && (reduced || heat[i] <= 0.02)) continue;
          if (v <= 0.04) {
            if (!reduced && heat[i] > 0.02) {
              ctx.fillStyle = BG;
              ctx.fillRect(x * cw - 0.5, y * chh - 0.5, cw + 1, chh + 1);
              ctx.drawImage(dotSprites!.heat[Math.min(7, (heat[i] * 8) | 0)],
                x * cw + cw * 0.08, y * chh + chh * 0.08, cw * 0.84, chh * 0.84);
            }
            continue;
          }
          ctx.fillStyle = BG;
          ctx.fillRect(x * cw - 0.5, y * chh - 0.5, cw + 1, chh + 1);
          const sx = Math.abs(2 * v - 1);
          if (sx < 0.03) continue;
          ctx.drawImage(v > 0.5 ? dotSprites!.on : dotSprites!.off,
            x * cw + cw / 2 - cw * 0.42 * sx, y * chh + chh * 0.08, cw * 0.84 * sx, chh * 0.84);
        }
        activeN = w;
      }

      // laser eyes overlay: the one sanctioned red, and only while the meme is on
      laserP += ((laserOn ? 1 : 0) - laserP) * (reduced ? 1 : 0.25);
      if (laserMask && laserP > 0.02) {
        const flick = reduced ? 1 : 0.86 + 0.14 * Math.sin(t * 24) * Math.sin(t * 7.3);
        for (let i = 0; i < laserMask.length; i++) {
          const a0 = laserMask[i];
          if (a0 <= 0.03) continue;
          const a = Math.min(1, a0 * 1.35 * laserP * flick);
          const x = i % cols, y = (i / cols) | 0;
          ctx.fillStyle = a0 > 0.92
            ? `rgba(255,244,236,${a})`
            : `rgba(255,${(20 + 90 * a0) | 0},16,${a})`;
          ctx.beginPath();
          ctx.ellipse(x * cw + cw / 2, y * chh + chh / 2, cw * 0.42, chh * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (!laserOn && laserP <= 0.02) laserMask = null;
      }

      // the now-playing title slides its underline in on hover, like any link
      if (nowLink) {
        nowLink.hoverP += ((nowLink.hover ? 1 : 0) - nowLink.hoverP) * (reduced ? 1 : 0.22);
        if (Math.abs((nowLink.hover ? 1 : 0) - nowLink.hoverP) > 0.01) motion = true;
        if (nowLink.hoverP >= 0.02) {
          const uy = nowLink.row + 8;
          if (uy < rows) {
            const n = Math.round(nowLink.wCols * nowLink.hoverP);
            for (let c = 0; c < n; c++) {
              const xx = nowLink.col + c;
              if (xx >= cols) break;
              ctx.drawImage(dotSprites!.on, xx * cw + cw * 0.08, uy * chh + chh * 0.08, cw * 0.84, chh * 0.84);
            }
          }
        }
      }

      for (const l of links) {
        l.hoverP += ((l.hover ? 1 : 0) - l.hoverP) * (reduced ? 1 : 0.22);
        if (Math.abs((l.hover ? 1 : 0) - l.hoverP) > 0.01) motion = true;
        if (l.hoverP < 0.02) continue;
        const uy = l.row + l.gh * l.scale + 1;
        if (uy >= rows) continue;
        const n = Math.round(l.wCols * l.hoverP);
        for (let c = 0; c < n; c++) {
          const xx = l.col + c;
          if (xx >= cols) break;
          ctx.drawImage(dotSprites!.on, xx * cw + cw * 0.08, uy * chh + chh * 0.08, cw * 0.84, chh * 0.84);
        }
      }
      if (motion) wake();
      raf = requestAnimationFrame(frame);
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "c" || e.key === "C") { cursorMode = (cursorMode + 1) % 3; wake(); dirtyTargets = true; }
      if (e.key === "d" || e.key === "D") {
        const i = DENSITIES.findIndex((v) => Math.abs(v - density) < 0.01);
        density = DENSITIES[(i + 1) % DENSITIES.length];
        resize();
        console.info(`[board] density ${density}x — ${cols}x${rows} dots`);
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const p = currentPage.split(":");
        if (p[0] === "BOOKS" && p[1] === "SHELF") {
          const n = (parseInt(p[3] || "1", 10) || 1) + (e.key === "ArrowRight" ? 1 : -1);
          if (n >= 1) navigate("BOOKS:SHELF:" + p[2] + ":" + n); // composeBooks clamps to the last page
        }
      }
    };
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; if (cursorMode !== 0) { wake(); dirtyTargets = true; } };
    const onOut = () => { mx = -1e4; my = -1e4; wake(); dirtyTargets = true; };
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) { mx = e.touches[0].clientX; my = e.touches[0].clientY; if (cursorMode !== 0) { wake(); dirtyTargets = true; } }
    };
    const onTouchEnd = () => { mx = -1e4; my = -1e4; };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onOut);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("resize", resize);

    // deep link: land on the page in the hash
    currentPage = pageFromHash();
    const onPop = () => navigate(pageFromHash(), true);
    window.addEventListener("popstate", onPop);

    resize();
    loadPortrait("/kjel-board.jpg", pctx, () => {
      compose(currentPage);
      // boot: deal the whole board in with one wipe
      if (!reduced) {
        prevLum = new Float32Array(cols * rows);
        prevMask = null;
        transStart = performance.now() / 1000;
      }
    });
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(nowTimer);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onOut);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", resize);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <>
      <style>{`
        .fd-hot { position: fixed; z-index: 2; display: block; cursor: pointer; }
        .fd-hot:focus-visible { outline: 2px solid ${ON}; outline-offset: 3px; }
      `}</style>
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", display: "block", background: BG }}
        aria-label="kjel.me — the whole site is a flip-dot display. A fixed table of contents navigates; pages flip in place."
      />
      <div ref={hotsRef} />
    </>
  );
}
