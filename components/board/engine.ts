// The flip-dot engine. One Board owns a canvas, a dot grid, and a frame loop.
// A scene composes pages into the grid (text mask + a raster layer) and may
// register dynamic layers that change every frame (a clock, a sprite). The
// engine does the rest: dot physics with afterglow, the dithered page wipe,
// hover underlines, cursor trail, hotspots for links.

import { glyph, glyphM, measureCols, measureM } from "./font";
import { ON, OFF, BG, HEAT, HEAT_FREE, accentRGB, accentCSS } from "./palette";
import { loadFilm, type Film } from "./film";
import { hash2, easeInOut, rasterToCells } from "./raster";
import { PW, PH } from "./portrait";

export type LinkRec = { page: string; col: number; row: number; scale: number; wCols: number; gh: number; hover: boolean; hoverP: number; since?: number; pinned?: boolean };
/** a dynamic dot layer: mask cells force a lit dot, halo cells force a dark one under raster content */
export type Layer = { mask: Uint8Array; halo: Uint8Array | null; key: string; /** dots this layer leaves behind go dark at once: for text that moves */ cold?: boolean };
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
  /** link names that do something on the board itself, e.g. LIFE → run the automaton */
  actions?: Record<string, (b: Board) => void>;
  /** words that, typed on the board, do something the board never advertises */
  codes?: Record<string, (b: Board) => void>;
  /** called when a routed link is clicked; the shell wipes the board and navigates */
  onRoute?: (path: string) => void;
  /** open an HTML card over the board by id, or null to close it. The shell renders it */
  onCard?: (id: string | null) => void;
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
  /** the unlit grid thins out over this many rows at the bottom: a board dissolving into the page */
  fadeBottom?: number;
  /** "absolute": hotspots are positioned inside the hots element (an inline board); default fixed/document */
  hotsMode?: "absolute";
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
  /** cells lit last frame by a cold layer: they cool without afterglow */
  private coldPrev = new Uint8Array(0);
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
  /** boxes of the composition (virtual rows) whose lit dots take a colour */
  tints: { x0: number; y0: number; x1: number; y1: number; color: (t: number, x: number, y: number) => string }[] = [];

  cursorMode = 1; // C cycles: 0 none · 1 trail · 2 guides
  /** Conway's Life over the screen grid, seeded from whatever the dots show. null when off */
  /** a film playing over the whole board: nothing else is lit while it runs */
  film: { f: Film; at: number; scale: number; ox: number; oy: number } | null = null;
  filmLoading = false;
  /** the last letters typed, so a word can open something the board never mentions */
  private typed = "";
  /** cells live on a coarser lattice than the dots: k dots per cell, gw×gh cells, so a cell is a real click target */
  life: { cells: Uint8Array; next: Uint8Array; at: number; gen: number; running: boolean; k: number; gw: number; gh: number; /** the visitor has drawn something themselves */ touched: boolean } | null = null;
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
    on("keydown", (e) => { touch(); if (e.key === "c" || e.key === "C") this.cursorMode = (this.cursorMode + 1) % 3; if (e.key === "Escape" && !this.cardOpen) { if (this.film) this.stopFilm(); else this.stopLife(); }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (/^[a-z]$/i.test(e.key)) {
        this.typed = (this.typed + e.key.toLowerCase()).slice(-16);
        for (const word of Object.keys(this.opts.codes || {})) if (this.typed.endsWith(word)) { this.typed = ""; this.opts.codes![word](this); break; }
      }
    });
    on("pointerdown", () => { if (this.film) this.stopFilm(); });
    // the Life editor: press a dot to flip it, drag to paint
    on("pointerdown", (e) => {
      if (!this.life || e.button !== 0 || this.onHot(e.target)) return;
      const i = this.cellAt(e.clientX, e.clientY);
      if (i < 0) return;
      this.paintTo = this.life.cells[i] ? 0 : 1;
      this.life.cells[i] = this.paintTo;
      this.life.touched = true;
      this.painting = true; this.paintX = e.clientX; this.paintY = e.clientY;
    });
    on("pointermove", (e) => {
      if (!this.painting || !this.life) return;
      // walk from the last point so a fast drag leaves no gaps
      const x0 = this.paintX, y0 = this.paintY, x1 = e.clientX, y1 = e.clientY;
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (Math.min(this.cw, this.chh) * this.life.k)));
      for (let k = 0; k <= n; k++) { const i = this.cellAt(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n); if (i >= 0) this.life.cells[i] = this.paintTo; }
      this.paintX = x1; this.paintY = y1;
    });
    on("pointerup", () => { this.painting = false; });
    on("mousemove", (e) => { touch(); this.mx = e.clientX; this.my = e.clientY; });
    on("mouseout", () => { this.mx = -1e4; this.my = -1e4; });
    on("touchmove", (e) => { touch(); if (e.touches[0]) { this.mx = e.touches[0].clientX; this.my = e.touches[0].clientY; } }, { passive: true });
    on("touchstart", touch, { passive: true });
    on("touchend", () => { this.mx = -1e4; this.my = -1e4; });
    on("resize", () => this.resize());
  }

  get wide() { return this.W / this.H > 1.05; }

  /** colour the lit dots inside a box of the composition; cleared by compose */
  tint(x0: number, y0: number, x1: number, y1: number, color: (t: number, x: number, y: number) => string) {
    this.tints.push({ x0, y0, x1, y1, color });
  }

  /** the one colour on the board (see palette.ts), with a shimmer running along x */
  lifeColor(t: number, x: number) {
    return `rgba(${accentRGB()},${(0.6 + 0.4 * Math.sin(t * 2.4 - x * 0.22)).toFixed(3)})`;
  }

  /* ---------- a film: the board as a 1-bit screen ---------- */

  /** fetch a film and play it over the whole board. Esc, a click or the end stops it */
  async playFilm(url: string, loop = false) {
    if (this.film || this.filmLoading) return;
    this.filmLoading = true;
    const f = await loadFilm(url);
    this.filmLoading = false;
    if (!f) return;
    this.stopLife();
    this.filmLoop = loop;
    this.film = { f, at: 0, scale: 1, ox: 0, oy: 0 };
    this.fitFilm();
    this.lifeOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    this.hots.dataset.life = "1";
    this.lastInput = performance.now() / 1000;
  }

  stopFilm() {
    if (!this.film) return;
    this.film = null;
    document.documentElement.style.overflow = this.lifeOverflow;
    delete this.hots.dataset.life;
  }

  private filmLoop = false;

  /** letterbox the film into the board, whole dots per cell where it can */
  private fitFilm() {
    const F = this.film;
    if (!F) return;
    const s = Math.min(this.cols / F.f.w, this.rows / F.f.h);
    F.scale = s;
    F.ox = Math.round((this.cols - F.f.w * s) / 2);
    F.oy = Math.round((this.rows - F.f.h * s) / 2);
  }

  /* ---------- life: a blank board you seed by hand, then run ---------- */

  /** enter the Life editor (an empty grid, scroll locked), or leave it if it is open */
  toggleLife() {
    if (this.life) { this.stopLife(); return; }
    // a cell should be about 18px across whatever the dot pitch is, and closer to 26px for a finger
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const k = Math.max(2, Math.round((coarse ? 26 : 18) / this.cw));
    const gw = Math.ceil(this.cols / k), gh = Math.ceil(this.rows / k), n = gw * gh;
    this.life = { cells: new Uint8Array(n), next: new Uint8Array(n), at: 0, gen: 0, running: false, k, gw, gh, touched: false };
    this.lifeOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    this.hots.dataset.life = "1"; // the page's own links step aside (CSS); only the editor's and the menu's stay live
    // a finger on the board paints; it must not scroll
    document.documentElement.style.touchAction = "none";
    this.canvas.style.touchAction = "none";
    this.lastInput = performance.now() / 1000;
  }

  stopLife() {
    if (!this.life) return;
    this.life = null;
    this.painting = false;
    delete this.hots.dataset.life;
    document.documentElement.style.overflow = this.lifeOverflow;
    document.documentElement.style.touchAction = "";
    this.canvas.style.touchAction = "";
  }

  /** run or pause the automaton */
  lifePlay() { if (this.life) { this.life.running = !this.life.running; this.life.at = 0; } }

  lifeClear() { if (this.life) { this.life.cells.fill(0); this.life.gen = 0; this.life.running = false; this.life.touched = true; } }

  /** put a pattern on the grid, its top-left at a fraction of the width and height */
  lifeSeed(pattern: string[], fx: number, fy: number) {
    const L = this.life;
    if (!L) return;
    const x0 = Math.round(L.gw * fx), y0 = Math.round(L.gh * fy);
    for (let r = 0; r < pattern.length; r++) for (let c = 0; c < pattern[r].length; c++) {
      if (pattern[r][c] !== "#") continue;
      const x = x0 + c, y = y0 + r;
      if (x >= 0 && x < L.gw && y >= 0 && y < L.gh) L.cells[y * L.gw + x] = 1;
    }
  }

  private lifeOverflow = "";
  private painting = false;
  private paintTo = 1;
  private paintX = 0; private paintY = 0;

  /** index of the Life cell under a client point, -1 outside or when Life is off */
  private cellAt(x: number, y: number) {
    const L = this.life;
    if (!L) return -1;
    const c = Math.floor(x / (this.cw * L.k)), r = Math.floor(y / (this.chh * L.k));
    return c < 0 || c >= L.gw || r < 0 || r >= L.gh ? -1 : r * L.gw + c;
  }

  /** true when the event landed on a link hotspot or an HTML card rather than the board */
  private onHot(t: EventTarget | null) {
    return t instanceof Element && ((t !== this.hots && this.hots.contains(t)) || !!t.closest("[data-glass]"));
  }

  /** a glass card over the board, drawn by the shell; null closes it. Esc goes to the card while one is open */
  cardOpen = false;
  card(id: string | null) { this.cardOpen = !!id; this.opts.onCard?.(id); }

  private stepLife() {
    const L = this.life!, cols = L.gw, rows = L.gh, a = L.cells, b = L.next;
    for (let y = 0; y < rows; y++) {
      const yu = (y === 0 ? rows - 1 : y - 1) * cols, yd = (y === rows - 1 ? 0 : y + 1) * cols, yc = y * cols;
      for (let x = 0; x < cols; x++) {
        const xl = x === 0 ? cols - 1 : x - 1, xr = x === cols - 1 ? 0 : x + 1;
        const nb = a[yu + xl] + a[yu + x] + a[yu + xr] + a[yc + xl] + a[yc + xr] + a[yd + xl] + a[yd + x] + a[yd + xr];
        b[yc + x] = nb === 3 || (nb === 2 && a[yc + x]) ? 1 : 0;
      }
    }
    L.cells = b; L.next = a; L.gen++;
  }

  /** what the composition holds at a screen cell: 0 nothing, 1 the dark halo around text, 2 text. Layers use it to pass behind words */
  textAt(x: number, y: number) {
    const tm = this.textMask;
    if (!tm || x < 0 || x >= this.cols || y < 0 || y >= this.rows) return 0;
    return tm[(y + this.winRow) * this.cols + x];
  }

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
      const act = this.opts.actions?.[link];
      const fn = ext ? undefined : act ? () => act(this) : route ? () => this.opts.onRoute?.(route) : () => this.navigate(link);
      // hot areas never dip below the 44px touch minimum, centered on the glyphs
      const hw = Math.max(44, wCols * cw + 12), hh2 = Math.max(44, gh * scale * chh + 12);
      const a = this.hotAt(col * cw + (wCols * cw) / 2 - hw / 2, row * chh + (gh * scale * chh) / 2 - hh2 / 2, hw, hh2,
        link.toLowerCase(), fn, ext || route);
      if (ext && !ext.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noreferrer"; }
      const touch = () => { rec.since = performance.now() / 1000; };
      a.addEventListener("mouseenter", () => { rec.hover = true; touch(); });
      a.addEventListener("mouseleave", () => { rec.hover = false; });
      a.addEventListener("focus", () => { rec.hover = true; touch(); });
      a.addEventListener("blur", () => { rec.hover = false; });
      a.addEventListener("pointerdown", touch);
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
  stampG(pat: string[], col: number, row: number, scale = 1) {
    const { cols, vrows } = this, tm = this.textMask!;
    for (let r = 0; r < pat.length; r++) for (let c = 0; c < pat[r].length; c++) {
      if (pat[r][c] !== "1") continue;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const yy = row + r * scale + sy, xx = col + c * scale + sx;
        if (xx >= 0 && xx < cols && yy >= 0 && yy < vrows) tm[yy * cols + xx] = 2;
      }
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
    a.style.position = this.opts.hotsMode === "absolute" ? "absolute" : this.pinHots || this.vrows === this.rows ? "fixed" : "absolute";
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
    const rec: LinkRec = { page: "PIN:" + link, col, row, scale: 1, wCols, gh, hover: false, hoverP: 0, pinned: true };
    this.extraLinks = this.extraLinks.filter((l) => l.page !== rec.page);
    this.extraLinks.push(rec);
    const ext = this.opts.external?.[link], route = this.opts.routes?.[link], act = this.opts.actions?.[link];
    const fn = ext ? undefined : act ? () => act(this) : route ? () => this.opts.onRoute?.(route) : () => this.navigate(link);
    const hw = Math.max(44, wCols * cw + 12), hh2 = Math.max(44, gh * chh + 12);
    const was = this.pinHots; this.pinHots = true;
    const a = this.hotAt(col * cw + (wCols * cw) / 2 - hw / 2, row * chh + (gh * chh) / 2 - hh2 / 2, hw, hh2, link.toLowerCase(), fn, ext || route);
    this.pinHots = was;
    if (ext && !ext.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noreferrer"; }
    const touch = () => { rec.since = performance.now() / 1000; };
    a.addEventListener("mouseenter", () => { rec.hover = true; touch(); });
    a.addEventListener("mouseleave", () => { rec.hover = false; });
    a.addEventListener("focus", () => { rec.hover = true; touch(); });
    a.addEventListener("blur", () => { rec.hover = false; });
    a.addEventListener("pointerdown", touch);
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
    this.stopLife();
    this.tints = [];
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

  /** leave the board for a route (the shell decides how) */
  route(path: string) { this.opts.onRoute?.(path); }

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
    const fade = this.opts.fadeBottom ?? 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      // the bottom rows thin out: a dithered edge where the board gives way to the page
      if (fade && y > rows - fade && hash2(x, y) < (y - (rows - fade)) / fade) continue;
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
    this.coldPrev = new Uint8Array(n);
    this.trailV = new Float32Array(n);
    this.prevLum = null; this.prevMask = null; this.transStart = -1;
    for (const l of this.layers) { l.mask = new Uint8Array(n); l.halo = null; l.key = ""; }
    this.fitFilm();
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
    const life = this.life;
    if (!reduced && !life && cursorMode === 1 && trailV && mx > -9999) {
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
    const dotV = this.dotV, heat = this.heat, coldPrev = this.coldPrev;
    // links touched in the last moment ripple: an inverted band sweeps through the word's dots
    const RIP = 0.5;
    const ripples: { x0: number; x1: number; y0: number; y1: number; p: number; pinned: boolean }[] = [];
    if (!reduced) for (const l of this.links.length + this.extraLinks.length ? [...this.links, ...this.extraLinks] : []) {
      if (l.since === undefined) continue;
      const age = t - l.since;
      if (age < 0 || age > RIP) continue;
      ripples.push({ x0: l.col, x1: l.col + l.wCols, y0: l.row, y1: l.row + l.gh * l.scale, p: age / RIP, pinned: !!l.pinned });
    }
    // a virtual board: the screen is a window `off` rows down the composition, moved a whole row at a time
    if (this.vrows > rows && this.opts.scrollOffset) this.winRow = Math.max(0, Math.min(this.vrows - rows, Math.floor(this.opts.scrollOffset() / chh)));
    else this.winRow = 0;
    const off = this.winRow;
    // the window moved: carry the dot state with the content so what merely moved does not
    // re-flip. only the rows revealed at the edge start dark and flip in. pinned rows stay put.
    const k = off - this.prevWinRow;
    if (k !== 0) {
      this.stopLife(); // life is in screen space; a scroll ends it
      const band = Math.min(rows, this.pinnedRows), from = band * cols, to = rows * cols;
      // the layers (clock, pins) are screen space: lift their dots out before the shift so they leave
      // no afterglow behind, and set them back after so they do not re-flip
      const layered = new Uint8Array(to);
      for (let q = 0; q < nL; q++) { const m = layers[q].mask, h = layers[q].halo; for (let i = from; i < to; i++) { if (m[i]) layered[i] = 2; else if (h && h[i] && !layered[i]) layered[i] = 1; } }
      for (let i = from; i < to; i++) if (layered[i]) { dotV[i] = 0; heat[i] = 0; if (trailV) trailV[i] = 0; }
      for (const arr of [dotV, heat, trailV]) {
        if (!arr) continue;
        if (k > 0 && k < rows - band) { arr.copyWithin(from, from + k * cols, to); arr.fill(0, to - k * cols, to); }
        else if (k < 0 && -k < rows - band) { arr.copyWithin(from - k * cols, from, to + k * cols); arr.fill(0, from, from - k * cols); }
        else arr.fill(0, from, to);
      }
      for (let i = from; i < to; i++) if (layered[i]) { dotV[i] = layered[i] === 2 ? 1 : 0; heat[i] = 0; }
      this.prevWinRow = off;
    }
    // the film owns the board while it plays: one step per frame period, then it stops
    const film = this.film;
    if (film) {
      if (!film.at) film.at = t;
      const want = Math.floor((t - film.at) * film.f.fps);
      let guard = 0;
      while (film.f.index < want && guard++ < 4) if (!film.f.step(this.filmLoop)) { this.stopFilm(); break; }
    }
    // life: step the automaton at 8 Hz while it runs; the dot under the cursor is the cursor
    if (life && life.running && !inTrans && t - life.at > 0.125) { this.stepLife(); life.at = t; }
    const lifeCur = life && mx > -9999 && !this.onHot(document.elementFromPoint(mx, my)) ? this.cellAt(mx, my) : -1;
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
      let lit = false, haloed = false, cold = false;
      if (!useOld && !film) for (let k = 0; k < nL; k++) { if (layers[k].mask[i]) { lit = true; cold = !!layers[k].cold; break; } const h = layers[k].halo; if (h && h[i]) haloed = true; }
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
        if (!reduced && !life && cursorMode === 1 && m === 0 && trailV[i] > 0.25) target = 1;
      }
      if (!reduced && !life && cursorMode === 2 && m === 0 && guideOK && guideOK[vi] && mx > -9999 &&
          (x === curCol || y === curRow) && (x + y) % 3 === 0) {
        target = 1;
      }
      for (let r = 0; r < ripples.length; r++) {
        const rp = ripples[r], ry = rp.pinned ? y : vy;
        if (x < rp.x0 || x >= rp.x1 || ry < rp.y0 || ry >= rp.y1) continue;
        const span = rp.x1 - rp.x0 + 4, head = rp.p * span, u = x - rp.x0 + hash2(x, ry) * 2;
        if (u < head && u > head - span * 0.3) target = 1 - target;
      }
      if (film) {
        const fx = Math.floor((x - film.ox) / film.scale), fy = Math.floor((y - film.oy) / film.scale);
        target = fx >= 0 && fx < film.f.w && fy >= 0 && fy < film.f.h ? film.f.cells[fy * film.f.w + fx] : 0;
      }
      else if (life && !lit && !haloed) { const ci = ((y / life.k) | 0) * life.gw + ((x / life.k) | 0); target = life.cells[ci] || (ci === lifeCur ? 1 : 0); }
      const pv = dotV[i];
      const wasCold = coldPrev[i]; coldPrev[i] = lit && cold ? 1 : 0;
      dotV[i] += (target - dotV[i]) * (reduced || wasCold ? 1 : 0.38);
      const v = dotV[i];
      if (!reduced) {
        if (pv > 0.5 && v <= 0.5) heat[i] = wasCold ? 0 : 1;
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

    // tinted dots: the boxes the scene marked, and every live cell in Life
    const dot = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x * cw + cw / 2, y * chh + chh / 2, cw * 0.42, chh * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const tb of (film ? [] : this.tints)) {
      for (let vy = Math.max(tb.y0, off); vy < Math.min(tb.y1, off + rows); vy++) for (let x = Math.max(0, tb.x0); x < Math.min(cols, tb.x1); x++) {
        const y = vy - off, i = y * cols + x;
        if (dotV[i] > 0.5 && (!life || !life.cells[((y / life.k) | 0) * life.gw + ((x / life.k) | 0)])) dot(x, y, tb.color(t, x, vy));
      }
    }
    if (life) {
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (dotV[i] <= 0.5 || !life.cells[((y / life.k) | 0) * life.gw + ((x / life.k) | 0)]) continue;
        let under = false;
        for (let q = 0; q < nL; q++) if (layers[q].mask[i]) { under = true; break; }
        if (!under) dot(x, y, this.lifeColor(t, x));
      }
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
      // links in the composition scroll with it; pinned ones are already in screen rows
      const uy = (l.pinned ? l.row : l.row - off) + l.gh * l.scale + 1;
      if (uy < 0 || uy >= rows) continue;
      const n = Math.round(l.wCols * l.hoverP);
      ctx.fillStyle = accentCSS(); // reaching for a link is the one time the board answers in colour
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
