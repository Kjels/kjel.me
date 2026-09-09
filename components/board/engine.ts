// The flip-dot engine. One Board owns a canvas, a dot grid, and a frame loop.
// A scene composes pages into the grid (text mask + a raster layer) and may
// register dynamic layers that change every frame (a clock, a sprite). The
// engine does the rest: dot physics with afterglow, the dithered page wipe,
// hover underlines, cursor trail, hotspots for links.

import { glyph, glyphM, measureCols, measureM } from "./font";
import { ON, OFF, BG, HEAT, HEAT_FREE } from "./palette";
import { hash2, easeInOut, rasterToCells } from "./raster";
import { PW, PH } from "./portrait";

export type LinkRec = { page: string; col: number; row: number; scale: number; wCols: number; gh: number; hover: boolean; hoverP: number };
/** a dynamic dot layer: mask cells force a lit dot, halo cells force a dark one under raster content */
export type Layer = { mask: Uint8Array; halo: Uint8Array | null; key: string };
/** a coloured overlay drawn on top of the dots, faded in and out by `on` */
export type Fx = { mask: Float32Array | null; on: boolean; p: number; color: (a0: number, a: number) => string };
export type Box = { x0: number; x1: number; y0: number; y1: number };
export type Line = { ax: number; ay: number; bx: number; by: number };

export type BoardOptions = {
  canvas: HTMLCanvasElement;
  /** container for the invisible <a> hotspots laid over the canvas */
  hots: HTMLElement;
  /** rows for a given viewport; cols follow the aspect so dots stay round */
  rows: (W: number, H: number) => number;
  compose: (b: Board, page: string) => void;
  /** per-frame hook for dynamic layers; runs before the dots are drawn */
  tick?: (b: Board, t: number) => void;
  /** called after an in-board navigation; the shell owns the URL */
  onNavigate?: (page: string) => void;
  /** link names that leave the board, e.g. EMAIL → mailto: */
  external?: Record<string, string>;
  /** link names that leave the board for another route, e.g. WORK → /work */
  routes?: Record<string, string>;
  /** called when a routed link is clicked; the shell wipes the board and navigates */
  onRoute?: (path: string) => void;
  reduced?: boolean;
  page?: string;
  /** false: no unlit grid. Only lit dots and their afterglow are drawn (pictograms) */
  grid?: boolean;
  /** a board taller than the screen: total rows given the screen's rows and cols. The page scrolls it. */
  virtualRows?: (rows: number, cols: number) => number;
  /** current scroll position in px, read every frame when the board is virtual */
  scrollOffset?: () => number;
  /** called after every fit, e.g. to size the page to the virtual board */
  onFit?: (b: Board) => void;
};

const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const TRANS = 0.75;

export class Board {
  readonly canvas: HTMLCanvasElement;
  readonly hots: HTMLElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly dpr: number;
  readonly reduced: boolean;
  private readonly opts: BoardOptions;

  // geometry: W/H css px, SW/SH the raster source size, K its scale, cw/chh dot pitch
  W = 0; H = 0; SW = 0; SH = 0; K = 1;
  cols = 0; rows = 0; cw = 0; chh = 0;
  /** total rows of the composition (== rows unless the board is virtual) and the window's first row */
  vrows = 0; winRow = 0;
  private prevWinRow = 0;
  /** screen rows at the top that are pinned (not shifted when the window scrolls) */
  pinnedRows = 0;
  /** while true, hotspots are position:fixed (pinned to the screen) rather than in the document */
  pinHots = false;

  /** the raster source: scenes draw images and vector marks here at scale K */
  readonly src = document.createElement("canvas");
  readonly sctx: CanvasRenderingContext2D;
  private readonly offLayer = document.createElement("canvas");

  cellLum: Float32Array | null = null;
  textMask: Uint8Array | null = null;
  private prevLum: Float32Array | null = null;
  private prevMask: Uint8Array | null = null;
  private dotV = new Float32Array(0);
  private heat = new Float32Array(0);
  private trailV: Float32Array | null = null;

  page: string;
  private transStart = -1;
  /** true between wipeOut() and the next compose(): all dots off, layers muted */
  private blank = false;

  /** the mark's slash: a lit core with a dark channel, cut through everything */
  slashLine: Line | null = null;
  private slashParam: Float32Array | null = null;
  private slashD: Float32Array | null = null;
  /** raster region that keeps a slow threshold shimmer (the portrait) */
  faceBox: Box | null = null;
  private guideOK: Uint8Array | null = null;

  links: LinkRec[] = [];
  /** links a scene manages itself across composes (the now-playing title) */
  extraLinks: LinkRec[] = [];
  layers: Layer[] = [];
  fx: Fx | null = null;

  cursorMode = 0; // C cycles: 0 none · 1 trail · 2 guides
  /** performance.now()/1000 of the last pointer or key input */
  lastInput = 0;
  private paused = false;
  private mx = -1e4; private my = -1e4; private pmx = -1e4; private pmy = -1e4;
  private raf = 0;
  private readonly off: (() => void)[] = [];

  constructor(opts: BoardOptions) {
    this.opts = opts;
    this.canvas = opts.canvas;
    this.hots = opts.hots;
    this.ctx = this.canvas.getContext("2d")!;
    this.sctx = this.src.getContext("2d", { willReadFrequently: true })!;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.reduced = opts.reduced ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.page = opts.page || "HOME";

    const on = <K extends keyof WindowEventMap>(k: K, fn: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) => {
      window.addEventListener(k, fn, o);
      this.off.push(() => window.removeEventListener(k, fn));
    };
    const touch = () => { this.lastInput = performance.now() / 1000; };
    this.lastInput = performance.now() / 1000;
    on("keydown", (e) => { touch(); if (e.key === "c" || e.key === "C") this.cursorMode = (this.cursorMode + 1) % 3; });
    on("mousemove", (e) => { touch(); this.mx = e.clientX; this.my = e.clientY; });
    on("mouseout", () => { this.mx = -1e4; this.my = -1e4; });
    on("touchmove", (e) => { touch(); if (e.touches[0]) { this.mx = e.touches[0].clientX; this.my = e.touches[0].clientY; } }, { passive: true });
    on("touchstart", touch, { passive: true });
    on("touchend", () => { this.mx = -1e4; this.my = -1e4; });
    on("resize", () => this.resize());
  }

  get wide() { return this.W / this.H > 1.05; }

  /* ---------- dynamic layers ---------- */

  layer(): Layer {
    const l: Layer = { mask: new Uint8Array(this.cols * this.rows), halo: null, key: "" };
    this.layers.push(l);
    return l;
  }

  /** stamp text into an arbitrary mask (value 1), 5x7 or micro */
  stampInto(mask: Uint8Array, text: string, col: number, row: number, scale = 1, micro = false) {
    const { cols, rows } = this;
    const gh = micro ? 5 : 7, gf = micro ? glyphM : glyph;
    let cx = col;
    for (const ch of text.toUpperCase()) {
      const g = gf(ch), gw = g[0].length;
      for (let r = 0; r < gh; r++) for (let c = 0; c < gw; c++) {
        if (g[r][c] !== "1") continue;
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
          const yy = row + r * scale + sy, xx = cx + c * scale + sx;
          if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) mask[yy * cols + xx] = 1;
        }
      }
      cx += (gw + 1) * scale;
    }
  }

  /** a 1-dot dark ring around a layer's lit cells so it reads over raster content */
  haloOf(l: Layer) {
    const { cols, rows } = this;
    const cm = l.mask, halo = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!cm[y * cols + x]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < cols && yy >= 0 && yy < rows && !cm[yy * cols + xx]) halo[yy * cols + xx] = 1;
      }
    }
    l.halo = halo;
  }

  /* ---------- composing: text mask + raster ---------- */

  /** stamp text into the page; a `link` also lays a hotspot and gets a hover underline */
  stamp(text: string, col: number, row: number, scale: number, link?: string, micro?: boolean, underline?: boolean) {
    const { cols, vrows, cw, chh } = this;
    const tm = this.textMask!;
    const gh = micro ? 5 : 7;
    const gf = micro ? glyphM : glyph;
    let cx = col;
    for (const ch of text.toUpperCase()) {
      const g = gf(ch), gw = g[0].length;
      for (let r = 0; r < gh; r++) for (let c = 0; c < gw; c++) {
        if (g[r][c] !== "1") continue;
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
          const yy = row + r * scale + sy, xx = cx + c * scale + sx;
          if (xx >= 0 && xx < cols && yy >= 0 && yy < vrows) tm[yy * cols + xx] = 2;
        }
      }
      cx += (gw + 1) * scale;
    }
    const wCols = (micro ? measureM(text) : measureCols(text)) * scale;
    if (underline) {
      const uy = row + gh * scale + (scale > 1 ? 2 : 1);
      for (let c2 = 0; c2 < wCols; c2++) {
        const xx = col + c2;
        if (xx >= 0 && xx < cols && uy >= 0 && uy < vrows) tm[uy * cols + xx] = 2;
      }
    }
    if (link) {
      const rec: LinkRec = { page: link, col, row, scale, wCols, gh, hover: false, hoverP: 0 };
      this.links.push(rec);
      const ext = this.opts.external?.[link];
      const route = this.opts.routes?.[link];
      const fn = ext ? undefined : route ? () => this.opts.onRoute?.(route) : () => this.navigate(link);
      // hot areas never dip below the 44px touch minimum, centered on the glyphs
      const hw = Math.max(44, wCols * cw + 12), hh2 = Math.max(44, gh * scale * chh + 12);
      const a = this.hotAt(col * cw + (wCols * cw) / 2 - hw / 2, row * chh + (gh * scale * chh) / 2 - hh2 / 2, hw, hh2,
        link.toLowerCase(), fn, ext || route);
      if (ext && !ext.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noreferrer"; }
      a.addEventListener("mouseenter", () => { rec.hover = true; });
      a.addEventListener("mouseleave", () => { rec.hover = false; });
      a.addEventListener("focus", () => { rec.hover = true; });
      a.addEventListener("blur", () => { rec.hover = false; });
    }
    return wCols;
  }

  /** a 2x2 block at a brighter mask value: the current-page mark */
  marker(col: number, row: number) {
    const { cols, vrows } = this, tm = this.textMask!;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const yy = row + dy, xx = col + dx;
      if (xx >= 0 && xx < cols && yy >= 0 && yy < vrows) tm[yy * cols + xx] = 4;
    }
  }

  /** stamp a pictogram (row strings) */
  stampG(pat: string[], col: number, row: number) {
    const { cols, vrows } = this, tm = this.textMask!;
    for (let r = 0; r < pat.length; r++) for (let c = 0; c < pat[r].length; c++) {
      if (pat[r][c] !== "1") continue;
      const yy = row + r, xx = col + c;
      if (xx >= 0 && xx < cols && yy >= 0 && yy < vrows) tm[yy * cols + xx] = 2;
    }
  }

  block(col: number, row: number, w: number, h: number) {
    const { cols, vrows } = this, tm = this.textMask!;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
      const yy = row + dy, xx = col + dx;
      if (xx >= 0 && xx < cols && yy >= 0 && yy < vrows) tm[yy * cols + xx] = 2;
    }
  }

  /** the smiley, optionally struck through like the J */
  stampSmiley(cx: number, cy: number, r: number, struck: boolean) {
    const { cols, vrows } = this, tm = this.textMask!;
    const dot = (x: number, y: number) => {
      const xx = Math.round(x), yy = Math.round(y);
      if (xx >= 0 && xx < cols && yy >= 0 && yy < vrows) tm[yy * cols + xx] = 2;
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

  /** an invisible anchor over a screen rect; cleared on every compose */
  hotAt(xs: number, ys: number, ws: number, hs: number, label: string, fn?: () => void, href?: string) {
    const a = document.createElement("a");
    a.className = "fd-hot";
    // on a virtual board hotspots live in the document and scroll with it; pinned ones stay on screen
    a.style.position = this.pinHots || this.vrows === this.rows ? "fixed" : "absolute";
    // never past the board's edge: an overflowing hotspot would widen the page on phones
    if (xs < 0) { ws += xs; xs = 0; }
    ws = Math.max(0, Math.min(ws, this.W - xs));
    a.href = href || "#";
    a.setAttribute("aria-label", label);
    a.style.left = `${xs}px`; a.style.top = `${ys}px`;
    a.style.width = `${ws}px`; a.style.height = `${hs}px`;
    if (fn) a.addEventListener("click", (e) => { e.preventDefault(); fn(); });
    this.hots.appendChild(a);
    return a;
  }

  /**
   * Pinned text: stamped into a screen-space layer (so it does not scroll with a virtual board)
   * with a fixed hotspot and a hover underline. Call from compose; layers persist across frames.
   */
  pinLink(L: Layer, text: string, col: number, row: number, micro: boolean, link: string) {
    const { cw, chh } = this;
    this.stampInto(L.mask, text, col, row, 1, micro);
    const gh = micro ? 5 : 7, wCols = micro ? measureM(text) : measureCols(text);
    const rec: LinkRec = { page: "PIN:" + link, col, row, scale: 1, wCols, gh, hover: false, hoverP: 0 };
    this.extraLinks = this.extraLinks.filter((l) => l.page !== rec.page);
    this.extraLinks.push(rec);
    const ext = this.opts.external?.[link], route = this.opts.routes?.[link];
    const fn = ext ? undefined : route ? () => this.opts.onRoute?.(route) : () => this.navigate(link);
    const hw = Math.max(44, wCols * cw + 12), hh2 = Math.max(44, gh * chh + 12);
    const was = this.pinHots; this.pinHots = true;
    const a = this.hotAt(col * cw + (wCols * cw) / 2 - hw / 2, row * chh + (gh * chh) / 2 - hh2 / 2, hw, hh2, link.toLowerCase(), fn, ext || route);
    this.pinHots = was;
    if (ext && !ext.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noreferrer"; }
    a.addEventListener("mouseenter", () => { rec.hover = true; });
    a.addEventListener("mouseleave", () => { rec.hover = false; });
    a.addEventListener("focus", () => { rec.hover = true; });
    a.addEventListener("blur", () => { rec.hover = false; });
    return wCols;
  }

  /** draw a PW×PH image onto the raster source centred on a screen point; sets the shimmer box */
  drawFace(buf: HTMLCanvasElement, cxScreen: number, cyScreen: number, scale: number) {
    const { SW, SH, K, cw, chh } = this;
    const s = Math.min(SW / PW, SH / PH) * scale;
    const dw = PW * s, dh = PH * s;
    this.sctx.drawImage(buf, cxScreen * K - dw / 2, cyScreen * K - dh / 2, dw, dh);
    const dws = dw / K, dhs = dh / K;
    this.faceBox = {
      x0: (cxScreen - dws / 2) / cw, x1: (cxScreen + dws / 2) / cw,
      y0: (cyScreen - dhs / 2) / chh, y1: (cyScreen + dhs / 2) / chh,
    };
    return dws;
  }

  /** the KJEL wordmark in Helvetica on the raster, with the slash through the J */
  drawMark(cap: number, xLeft: number | null, by: number) {
    const { sctx, K, W } = this;
    sctx.font = `800 ${((cap / 0.716) * K).toFixed(1)}px ${HELV}`;
    sctx.textAlign = "left"; sctx.textBaseline = "alphabetic"; sctx.fillStyle = "#fff";
    const wAll = sctx.measureText("KJEL").width / K;
    const x0 = xLeft === null ? (W - wAll) / 2 : xLeft;
    sctx.fillText("KJEL", x0 * K, by * K);
    const wK = sctx.measureText("K").width / K;
    const wKJ = sctx.measureText("KJ").width / K;
    const jx = x0 + (wK + wKJ) / 2;
    this.slashLine = { ax: jx + cap * 0.34, ay: by - cap * 1.12, bx: jx - cap * 0.3, by: by + cap * 0.22 };
    return this.slashLine;
  }

  private haloPass() {
    const { cols, vrows } = this, tm = this.textMask!;
    for (let y = 0; y < vrows; y++) for (let x = 0; x < cols; x++) {
      if (tm[y * cols + x] < 2) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < cols && yy >= 0 && yy < vrows && tm[yy * cols + xx] === 0) tm[yy * cols + xx] = 1;
      }
    }
  }

  /** run the scene's compose for a page, then derive everything the frame needs */
  compose(page = this.page) {
    const { cols, vrows, SW, cw, chh } = this;
    const SHv = this.src.height;
    this.sctx.fillStyle = "#000"; this.sctx.fillRect(0, 0, SW, SHv);
    this.hots.innerHTML = "";
    this.links = [];
    this.textMask = new Uint8Array(cols * vrows);
    this.slashLine = null; this.faceBox = null;
    this.blank = false;

    this.opts.compose(this, page);

    this.haloPass();
    this.cellLum = rasterToCells(this.sctx, SW, SHv, cols, vrows);

    // slash lane through the J: a permanent cut, like the mark
    this.slashParam = null;
    const sl = this.slashLine as Line | null;
    if (sl) {
      this.slashParam = new Float32Array(cols * vrows).fill(NaN);
      this.slashD = new Float32Array(cols * vrows);
      const ax = sl.ax / cw, ay = sl.ay / chh, bx = sl.bx / cw, by = sl.by / chh;
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      for (let y = 0; y < vrows; y++) for (let x = 0; x < cols; x++) {
        const t = ((x - ax) * dx + (y - ay) * dy) / len2;
        if (t < 0 || t > 1) continue;
        const px = ax + t * dx, py = ay + t * dy;
        const ddx = x - px, ddy = y - py;
        const d2v = ddx * ddx + ddy * ddy;
        if (d2v < 3.6) { this.slashParam[y * cols + x] = t; this.slashD[y * cols + x] = d2v; }
      }
    }

    // where cursor guides may draw: only the true void, 2 dots clear of any content
    let content = new Uint8Array(cols * vrows);
    const CL = this.cellLum, TM = this.textMask;
    for (let i = 0; i < cols * vrows; i++) content[i] = CL[i] > 0.3 || TM[i] >= 2 ? 1 : 0;
    for (let p = 0; p < 2; p++) {
      const d2 = Uint8Array.from(content);
      for (let y = 0; y < vrows; y++) for (let x = 0; x < cols; x++) {
        if (content[y * cols + x]) continue;
        for (let dy = -1; dy <= 1 && !d2[y * cols + x]; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && xx < cols && yy >= 0 && yy < vrows && content[yy * cols + xx]) { d2[y * cols + x] = 1; break; }
        }
      }
      content = d2;
    }
    this.guideOK = new Uint8Array(cols * vrows);
    for (let i = 0; i < cols * vrows; i++) this.guideOK[i] = content[i] ? 0 : 1;
  }

  /** flip to another page with the wipe; `silent` skips the URL callback (history navigation) */
  navigate(page: string, silent?: boolean) {
    if (page === this.page) return;
    this.page = page;
    if (!silent) this.opts.onNavigate?.(page);
    this.prevLum = this.cellLum; this.prevMask = this.textMask;
    this.compose(page);
    if (!this.reduced) this.transStart = performance.now() / 1000;
  }

  /** sweep every dot off and mute the layers; resolves when the wipe is done */
  wipeOut(): Promise<void> {
    return new Promise((res) => {
      const n = this.cols * this.vrows;
      this.blank = true;
      this.hots.innerHTML = "";
      this.links = []; this.extraLinks = [];
      for (const l of this.layers) { l.mask.fill(0); l.halo = null; l.key = ""; }
      if (this.reduced) { this.cellLum = new Float32Array(n); this.textMask = new Uint8Array(n); this.slashParam = null; this.faceBox = null; res(); return; }
      this.prevLum = this.cellLum; this.prevMask = this.textMask;
      this.cellLum = new Float32Array(n); this.textMask = new Uint8Array(n);
      this.slashParam = null; this.faceBox = null;
      this.transStart = performance.now() / 1000;
      window.setTimeout(res, TRANS * 1000);
    });
  }

  /** swap the row function (a different board shape) and rebuild */
  reshape(rows: (W: number, H: number) => number) {
    this.opts.rows = rows;
    this.resize();
  }

  /** deal the whole board in from dark with one wipe */
  boot() {
    if (this.reduced) return;
    this.prevLum = new Float32Array(this.cols * this.vrows);
    this.prevMask = null;
    this.transStart = performance.now() / 1000;
  }

  private buildOffLayer() {
    const { W, H, cols, rows, cw, chh, dpr } = this;
    this.offLayer.width = this.canvas.width; this.offLayer.height = this.canvas.height;
    const octx = this.offLayer.getContext("2d")!;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.opts.grid === false) { octx.clearRect(0, 0, W, H); return; } // gridless boards are transparent
    octx.fillStyle = BG; octx.fillRect(0, 0, W, H);
    octx.fillStyle = OFF;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      octx.beginPath();
      octx.ellipse(x * cw + cw / 2, y * chh + chh / 2, cw * 0.42, chh * 0.42, 0, 0, Math.PI * 2);
      octx.fill();
    }
  }

  /** read the canvas rect and rebuild the grid, arrays and off-dot layer for it */
  private fit() {
    const rect = this.canvas.getBoundingClientRect();
    this.W = Math.max(1, Math.round(rect.width || window.innerWidth));
    this.H = Math.max(1, Math.round(rect.height || window.innerHeight));
    const { W, H, dpr } = this;
    this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // one fixed resolution per orientation, like a real sign: the row count is
    // constant and the dot size fluid, so the composition reads identically on
    // every screen. cols follow the aspect ratio to keep the dots round.
    this.rows = Math.max(1, this.opts.rows(W, H));
    this.cols = Math.max(8, Math.round(this.rows * (W / H)));
    this.cw = W / this.cols; this.chh = H / this.rows;
    let K = Math.min(1, 1100 / Math.max(W, H));
    this.SW = Math.max(8, Math.round(W * K)); this.SH = Math.max(8, Math.round(H * K));
    this.K = K = this.SW / W;
    this.vrows = Math.max(this.rows, this.opts.virtualRows ? Math.round(this.opts.virtualRows(this.rows, this.cols)) : this.rows);
    this.src.width = this.SW; this.src.height = Math.round(this.SH * (this.vrows / this.rows));
    const n = this.cols * this.rows;
    this.dotV = new Float32Array(n);
    this.heat = new Float32Array(n);
    this.trailV = new Float32Array(n);
    this.prevLum = null; this.prevMask = null; this.transStart = -1;
    for (const l of this.layers) { l.mask = new Uint8Array(n); l.halo = null; l.key = ""; }
    this.buildOffLayer();
    this.opts.onFit?.(this);
  }

  resize() {
    this.fit();
    this.compose(this.page);
  }

  /**
   * While the canvas is animating between shapes: refit the grid to the
   * current rect and keep every dot off. Cheap enough to run per frame.
   */
  blankResize() {
    this.fit();
    const n = this.cols * this.vrows;
    this.cellLum = new Float32Array(n); this.textMask = new Uint8Array(n);
    this.slashParam = null; this.faceBox = null;
    this.hots.innerHTML = ""; this.links = []; this.extraLinks = [];
    this.blank = true;
    // resizing the backing store cleared the canvas; show the off grid now
    // rather than waiting a frame, so the sign never flashes flat
    if (this.opts.grid !== false) this.ctx.drawImage(this.offLayer, 0, 0, this.W, this.H);
    else this.ctx.clearRect(0, 0, this.W, this.H);
  }

  start() {
    this.paused = false;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.frame);
  }

  /** stop the frame loop (offscreen, hidden tab); start() resumes */
  pause() {
    this.paused = true;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    for (const f of this.off) f();
    this.hots.innerHTML = "";
  }

  /* ---------- the frame ---------- */

  private frame = (ms: number) => {
    const t = ms / 1000;
    const { ctx, cols, rows, cw, chh, W, H, reduced } = this;
    const grid = this.opts.grid !== false;
    if (!this.blank) this.opts.tick?.(this, t);

    const inTrans = this.transStart >= 0 && t - this.transStart < TRANS;
    if (this.transStart >= 0 && !inTrans) { this.transStart = -1; this.prevLum = null; this.prevMask = null; }
    const sweep = inTrans ? easeInOut((t - this.transStart) / TRANS) * (cols + 10) : 0;

    if (grid) ctx.drawImage(this.offLayer, 0, 0, W, H);
    else ctx.clearRect(0, 0, W, H);

    const { mx, my } = this;
    const trailV = this.trailV, cursorMode = this.cursorMode;
    const curCol = Math.floor(mx / cw), curRow = Math.floor(my / chh);
    if (!reduced && cursorMode === 1 && trailV && mx > -9999) {
      if (Math.hypot(mx - this.pmx, my - this.pmy) > 300 || this.pmx < -9999) { this.pmx = mx; this.pmy = my; }
      const x0 = this.pmx / cw, y0 = this.pmy / chh, x1 = mx / cw, y1 = my / chh;
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
    this.pmx = mx; this.pmy = my;

    const CL = this.cellLum!, TM = this.textMask!;
    const heatPal = grid ? HEAT : HEAT_FREE;
    const prevLum = this.prevLum, prevMask = this.prevMask;
    const slashParam = this.slashParam, slashD = this.slashD, faceBox = this.faceBox, guideOK = this.guideOK;
    const layers = this.layers, nL = layers.length;
    const dotV = this.dotV, heat = this.heat;
    // a virtual board: the screen is a window `off` rows down the composition, moved a whole row at a time
    if (this.vrows > rows && this.opts.scrollOffset) this.winRow = Math.max(0, Math.min(this.vrows - rows, Math.floor(this.opts.scrollOffset() / chh)));
    else this.winRow = 0;
    const off = this.winRow;
    // the window moved: carry the dot state with the content so what merely moved does not
    // re-flip. only the rows revealed at the edge start dark and flip in. pinned rows stay put.
    const k = off - this.prevWinRow;
    if (k !== 0) {
      const band = Math.min(rows, this.pinnedRows), from = band * cols, to = rows * cols;
      for (const arr of [dotV, heat, trailV]) {
        if (!arr) continue;
        if (k > 0 && k < rows - band) { arr.copyWithin(from, from + k * cols, to); arr.fill(0, to - k * cols, to); }
        else if (k < 0 && -k < rows - band) { arr.copyWithin(from - k * cols, from, to + k * cols); arr.fill(0, from, from - k * cols); }
        else arr.fill(0, from, to);
      }
      this.prevWinRow = off;
    }
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x, vy = y + off, vi = vy * cols + x;
      const useOld = inTrans && prevLum !== null && x + hash2(x, vy) * 8 > sweep;
      const L = useOld ? prevLum! : CL;
      const M = useOld ? prevMask : TM;
      const m = M ? M[vi] : 0;
      let target: number;
      const sp = !useOld && slashParam ? slashParam[vi] : NaN;
      // dynamic layers (the pinned line, the clock, the cyclist) sit in front of everything;
      // their halo is a dark ring that cuts whatever scrolls beneath them
      let lit = false, haloed = false;
      if (!useOld) for (let k = 0; k < nL; k++) { if (layers[k].mask[i]) { lit = true; break; } const h = layers[k].halo; if (h && h[i]) haloed = true; }
      if (lit) target = 1;
      else if (haloed) target = 0;
      else if (m >= 2) target = 1;
      else if (m === 1) target = 0;
      else if (sp === sp) {
        // the slash: a solid lit core with a dark channel cut around it
        target = slashD![vi] < 1 ? 1 : 0;
      } else {
        // fixed threshold: typography never moves; only the portrait keeps its shimmer
        let thr = 0.42;
        if (!reduced && !useOld && faceBox && x > faceBox.x0 && x < faceBox.x1 && vy > faceBox.y0 && vy < faceBox.y1) {
          thr = 0.42 + 0.06 * Math.sin(t * 0.5 - x * 0.13 - vy * 0.09);
        }
        target = L[vi] > thr ? 1 : 0;
      }
      // cursor layers (C toggles): stamped text is untouchable; guides live in the void only
      if (trailV && trailV[i] > 0) {
        trailV[i] *= 0.9;
        if (!reduced && cursorMode === 1 && m === 0 && trailV[i] > 0.25) target = 1;
      }
      if (!reduced && cursorMode === 2 && m === 0 && guideOK && guideOK[vi] && mx > -9999 &&
          (x === curCol || y === curRow) && (x + y) % 3 === 0) {
        target = 1;
      }
      const pv = dotV[i];
      dotV[i] += (target - dotV[i]) * (reduced ? 1 : 0.38);
      const v = dotV[i];
      if (!reduced) {
        if (pv > 0.5 && v <= 0.5) heat[i] = 1;
        else if (heat[i] > 0.02) heat[i] *= 0.96;
        else heat[i] = 0;
      }
      if (v <= 0.04) {
        // afterglow: thermal mass, the dot cools instead of snapping cold
        if (!reduced && heat[i] > 0.02) {
          if (grid) { ctx.fillStyle = BG; ctx.fillRect(x * cw - 0.5, y * chh - 0.5, cw + 1, chh + 1); }
          else ctx.clearRect(x * cw - 0.5, y * chh - 0.5, cw + 1, chh + 1);
          ctx.fillStyle = heatPal[Math.min(7, (heat[i] * 8) | 0)];
          ctx.beginPath();
          ctx.ellipse(x * cw + cw / 2, y * chh + chh / 2, cw * 0.42, chh * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }
      if (grid) { ctx.fillStyle = BG; ctx.fillRect(x * cw - 0.5, y * chh - 0.5, cw + 1, chh + 1); }
      else ctx.clearRect(x * cw - 0.5, y * chh - 0.5, cw + 1, chh + 1);
      const sx = Math.abs(2 * v - 1);
      if (sx < 0.03) continue;
      if (!grid && v <= 0.5) continue; // no unlit face to show
      ctx.fillStyle = v > 0.5 ? ON : OFF;
      ctx.beginPath();
      ctx.ellipse(x * cw + cw / 2, y * chh + chh / 2, cw * 0.42 * sx, chh * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // coloured overlay (the laser eyes): fades with fx.p, flickers while on
    const fx = this.fx;
    if (fx) {
      fx.p += ((fx.on ? 1 : 0) - fx.p) * (reduced ? 1 : 0.25);
      if (fx.mask && fx.p > 0.02) {
        const flick = reduced ? 1 : 0.86 + 0.14 * Math.sin(t * 24) * Math.sin(t * 7.3);
        for (let i = 0; i < fx.mask.length; i++) {
          const a0 = fx.mask[i];
          if (a0 <= 0.03) continue;
          const a = Math.min(1, a0 * 1.35 * fx.p * flick);
          const x = i % cols, y = (i / cols) | 0;
          ctx.fillStyle = fx.color(a0, a);
          ctx.beginPath();
          ctx.ellipse(x * cw + cw / 2, y * chh + chh / 2, cw * 0.42, chh * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (!fx.on && fx.p <= 0.02) fx.mask = null;
      }
    }

    // links slide their underline in on hover
    for (const l of this.extraLinks.length ? [...this.links, ...this.extraLinks] : this.links) {
      l.hoverP += ((l.hover ? 1 : 0) - l.hoverP) * (reduced ? 1 : 0.22);
      if (l.hoverP < 0.02) continue;
      const uy = l.row + l.gh * l.scale + 1;
      if (uy >= rows) continue;
      const n = Math.round(l.wCols * l.hoverP);
      ctx.fillStyle = ON;
      for (let c = 0; c < n; c++) {
        const xx = l.col + c;
        if (xx >= cols) break;
        ctx.beginPath();
        ctx.ellipse(xx * cw + cw / 2, uy * chh + chh / 2, cw * 0.42, chh * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!this.paused) this.raf = requestAnimationFrame(this.frame);
  };
}
