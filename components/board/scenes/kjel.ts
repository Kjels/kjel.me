// The kjel.me scene: what the board actually shows. Two compositions: HOME,
// the full landing with the mark, the portrait, the intro, the clock and the
// cyclist; and STRIP, the masthead over every HTML page. Plus the layers
// that move: clock and role, now-playing, the cyclist, the laser eyes.
// The engine knows none of this.

import type { BoardText } from "@/lib/board-text";
import { Board, type Layer, type LinkRec } from "../engine";
import { DS, measureCols, measureM, wrap, wrapM, fit } from "../font";
import { loadPortrait } from "../portrait";
import { ABOUT_LINES, ABOUT_INTERESTS, ABOUT_INTERESTS_LABEL } from "@/content/about";

/** one project, as the board shows it: a ledger line on the landing, a page of its own */
export type Entry = {
  slug: string; title: string; state: string; since: string; blurb: string; lines: string[];
  repo?: string; site?: string; gen?: string | null; pushed?: string | null; roadmap?: { done: number; total: number } | null;
};
/** what the ledger knows right now, for the landing's live line, menu previews and the in-board ledger */
export type Live = { pushed: string; entries: number; place: string; ledger: Entry[] };

/** the landing is three sections tall: home, work, about. home and work are a screen each; about takes what it needs */
export const SCREENS = 3;
/** the section a menu word scrolls to, in screens */
export const SECTION: Record<string, number> = { HOME: 0, WORK: 1, ABOUT: 2 };
/** the ledger is tiles: one full-width box per project, all the same shape */
const TILE_H = 48, TILE_GAP = 5, WORK_HEAD = 14 + 28 + 12;
/** rows from a section's start to its title: clear of the pinned band on narrow boards */
const SECTION_PAD = (wide: boolean) => (wide ? 14 : 26);
function tileGrid(rows: number, cols: number, n: number) {
  const wide = cols / rows > 1.05;
  const colL = wide ? Math.round(cols * 0.06) : 3, right = wide ? Math.round(cols * 0.94) : cols - 3;
  const per = 1;
  const tw = right - colL;
  const th = wide ? TILE_H : 70;
  const top = rows + (wide ? WORK_HEAD : SECTION_PAD(false) + 14 + 12);
  const tiles = Array.from({ length: n }, (_, i) => ({ x: colL + (i % per) * (tw + TILE_GAP), y: top + Math.floor(i / per) * (th + TILE_GAP), w: tw, h: th }));
  return { tiles, end: top + Math.ceil(n / per) * (th + TILE_GAP) + 12, wide };
}
/** where each section starts, in rows, for a board of this shape with n entries */
export function sectionRows(rows: number, cols: number, n: number) {
  const g = tileGrid(rows, cols, n);
  return { HOME: 0, WORK: rows, ABOUT: rows + Math.max(rows, g.end - rows) };
}
/** route name for an entry link on the board */
export const entryLink = (slug: string) => "ENTRY:" + slug;

const aboutMeasure = (cols: number, wide: boolean) => (wide ? Math.round(cols * 0.88) : cols - 6); // the full width between the gutters
/** about reads at double size on wide boards; single on phones, where double would fit five letters a line */
const aboutScale = (wide: boolean) => (wide ? 2 : 1);
/** rows the about section needs: title, lines, the interests, links, air */
function aboutRows(cols: number, wide: boolean) {
  const sc = aboutScale(wide), lh = sc * 7 + (sc > 1 ? 4 : 2), m = aboutMeasure(cols, wide);
  let n = SECTION_PAD(wide) + 28 + 12;
  for (const para of ABOUT_LINES) n += wrap(para, sc, m).length * lh + 4;
  n += 8 + wrap(ABOUT_INTERESTS_LABEL, 1, m).length * 9 + 1; // the label
  n += wrap(ABOUT_INTERESTS.join(" / "), 1, m).length * 9;
  return n + 12 + 7 + 24;
}

/** the sections, in menu order; each is an HTML route */
export const NAV = ["WORK", "ABOUT"];
export const ROUTES: Record<string, string> = { HOME: "/", WORK: "/work", ABOUT: "/about" };
/** the masthead: grid height in dots and CSS height in px (keep --strip-h in globals.css equal) */
export const STRIP_ROWS = 11;
export const STRIP_H = 60;

/** which menu word a pathname belongs to, "" for none */
export function sectionFor(path: string) {
  const seg = "/" + (path.split("/")[1] || "");
  for (const [name, route] of Object.entries(ROUTES)) if (route !== "/" && route === seg) return name;
  return "";
}

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// pupil positions as fractions of the portrait frame
const EYES: [number, number][] = [[0.386, 0.276], [0.55, 0.274]];

export function createKjelScene(TXT: BoardText, live?: Live) {
  const ROLES = TXT.roles; // sequential, never random: a first visit reads the sane ones first
  const external: Record<string, string> = { EMAIL: "mailto:hello@kjel.me", GITHUB: "https://github.com/Kjels" };
  let pins: Layer | null = null; // the pinned top line on the tall landing

  let portrait: HTMLCanvasElement | null = null;

  /* ---------- laser eyes: click the portrait, the meme happens ---------- */
  const laser = {
    mask: null as Float32Array | null,
    on: false,
    p: 0,
    color: (a0: number, a: number) => (a0 > 0.92 ? `rgba(255,244,236,${a})` : `rgba(255,${(20 + 90 * a0) | 0},16,${a})`),
  };

  function buildLaser(b: Board) {
    laser.mask = null;
    const fb = b.faceBox;
    if (!fb) return;
    const { cols, rows } = b;
    const m = new Float32Array(cols * rows);
    const set = (x: number, y: number, v: number) => {
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || xi >= cols || yi < 0 || yi >= rows) return;
      const i = yi * cols + xi;
      if (m[i] < v) m[i] = v;
    };
    const fw = fb.x1 - fb.x0, fh = fb.y1 - fb.y0;
    for (const [ex, ey] of EYES) {
      const cx = fb.x0 + ex * fw, cy = fb.y0 + ey * fh;
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
        for (let d = 1; d <= len; d++) set(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 0.85 * (1 - d / (len + 3)));
      }
    }
    laser.mask = m;
  }

  /* ---------- now listening ---------- */
  let nowTitle = "", nowArtist = "", nowUrl = "";
  let nowLink: LinkRec | null = null;
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

  function clearNowHot(b: Board) {
    if (nowHot && nowHot.isConnected) nowHot.remove();
    nowHot = null;
    if (nowLink) b.extraLinks = b.extraLinks.filter((l) => l !== nowLink);
    nowLink = null;
  }

  // the announcement: label, title (and artist when full) stacked from topRow;
  // "left" starts lines at anchorX, "center" centers them on it, "right" ends there.
  function stampNow(b: Board, L: Layer, mode: "left" | "center" | "right", anchorX: number, topRow: number, maxW: number, ss: number, full: boolean): boolean {
    const { cols, rows, cw, chh } = b;
    const cm = L.mask;
    const logo = DS.SPOTIFY, lw = logo[0].length, lPad = lw + 3;
    const ttl = fit(nowTitle, false, maxW - lPad);
    if (!ttl) { clearNowHot(b); return false; }
    const art = full ? fit(nowArtist, true, maxW) : "";
    const label = "NOW LISTENING";
    const px = (w: number) => (mode === "left" ? anchorX : mode === "right" ? anchorX - w : Math.round(anchorX - w / 2));
    const lx = px(measureM(label));
    b.stampInto(cm, label, lx, topRow, 1, true);
    // the on-air dot, beating with the seconds, hung in the margin
    if (b.reduced || ss % 2 === 0) {
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const yy = topRow + 1 + dy, xx = lx - 5 + dx;
        if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) cm[yy * cols + xx] = 1;
      }
    }
    const tw = measureCols(ttl), total = lPad + tw;
    const bx = mode === "left" ? anchorX : mode === "right" ? anchorX - total : Math.round(anchorX - total / 2);
    const tx = bx + lPad, ty = topRow + 8;
    // the spotify mark, dot-for-dot, beside the title
    for (let r = 0; r < logo.length; r++) for (let c = 0; c < lw; c++) {
      if (logo[r][c] !== "1") continue;
      const yy = ty - 1 + r, xx = bx + c;
      if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) cm[yy * cols + xx] = 1;
    }
    b.stampInto(cm, ttl, tx, ty, 1);
    if (art) b.stampInto(cm, art, px(measureM(art)), topRow + 17, 1, true);
    if (nowUrl) {
      if (!nowLink) { nowLink = { page: "NOW-PLAYING", col: tx, row: ty, scale: 1, wCols: tw, gh: 7, hover: false, hoverP: 0 }; b.extraLinks.push(nowLink); }
      else { nowLink.col = tx; nowLink.row = ty; nowLink.wCols = tw; }
      if (!nowHot || !nowHot.isConnected) {
        nowHot = document.createElement("a");
        nowHot.className = "fd-hot";
        nowHot.target = "_blank"; nowHot.rel = "noreferrer";
        nowHot.setAttribute("aria-label", "open the song on spotify");
        nowHot.addEventListener("mouseenter", () => { if (nowLink) nowLink.hover = true; });
        nowHot.addEventListener("mouseleave", () => { if (nowLink) nowLink.hover = false; });
        b.hots.appendChild(nowHot);
      }
      nowHot.href = nowUrl;
      const hw = Math.max(44, total * cw + 12), hh2 = Math.max(44, 9 * chh + 12);
      nowHot.style.left = `${bx * cw + (total * cw) / 2 - hw / 2}px`;
      nowHot.style.top = `${(ty - 1) * chh + (9 * chh) / 2 - hh2 / 2}px`;
      nowHot.style.width = `${hw}px`;
      nowHot.style.height = `${hh2}px`;
    } else clearNowHot(b);
    return true;
  }

  /* ---------- the clock + the role line, one dynamic layer ---------- */
  let clock: Layer | null = null;
  let current = "HOME"; // what compose last drew: HOME or STRIP:<section>

  function updateClock(b: Board, t: number) {
    const L = (clock ??= b.layer());
    const { cols, rows, wide, reduced } = b;
    const scrolled = b.winRow > Math.round(rows * 0.3) || current.startsWith("ENTRY:");
    const home = current === "HOME" && !scrolled;
    const fi = reduced ? 0 : Math.floor(t / 2.8) % ROLES.length;
    const key = current + "|" + (scrolled ? "s" : "h") + "|" + ((Date.now() / 1000) | 0) + "|" + fi + "|" + nowTitle;
    if (key === L.key) return;
    L.key = key;
    L.mask.fill(0);
    const d = new Date();
    const hh = d.getHours(), mm = d.getMinutes(), ss = d.getSeconds();
    const hhs = String(hh).padStart(2, "0"), mms = String(mm).padStart(2, "0");
    if (!home) {
      clearNowHot(b); // the announcement lives on home only
      // the strip, or the scrolled landing: a small clock on the top line, colon beating;
      // dropped when the mark and the menu leave it no room (phones)
      const row = current === "HOME" || current.startsWith("ENTRY:") ? 3 : Math.round((rows - 5) / 2);
      const w = measureM(hhs) + 2 + measureM(":") + 2 + measureM(mms);
      const navW = NAV.reduce((s, wd) => s + measureM(wd) + 6, 0) - 6;
      if (cols / 2 - w / 2 - 8 < 3 + measureM("KJEL.") || cols / 2 + w / 2 + 8 > cols - 3 - navW) { L.halo = null; return; }
      let x = Math.round((cols - w) / 2);
      b.stampInto(L.mask, hhs, x, row, 1, true); x += measureM(hhs) + 2;
      if (reduced || ss % 2 === 0) b.stampInto(L.mask, ":", x, row, 1, true);
      x += measureM(":") + 2;
      b.stampInto(L.mask, mms, x, row, 1, true);
      // what's playing, to the right of the clock, when there is room for it
      if (nowTitle) {
        const room = cols - 3 - navW - 10 - (x + measureM(mms) + 10) - 8; // less the disc mark
        const ttl = fit(nowTitle, true, room);
        if (ttl && room > 30) {
          const tx = x + measureM(mms) + 10;
          const logo = ["01110", "10001", "01110", "10001", "01110"]; // a tiny disc
          for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (logo[r][c] === "1") { const xx = tx + c, yy = row + r; if (xx < cols && yy < rows) L.mask[yy * cols + xx] = 1; }
          b.stampInto(L.mask, ttl, tx + 8, row, 1, true);
        }
      }
      L.halo = null;
      return;
    }
    const dateStr = DAYS[d.getDay()] + " " + String(d.getDate()).padStart(2, "0") + " " + MONTHS[d.getMonth()];
    if (wide) {
      // the clock honors the same 0.94 frame as the rest of the board
      const s = 2;
      const right = Math.round(cols * 0.94);
      const col0 = right - 25 * s;
      const row0 = rows - 27;
      // while music plays the song takes the role slot: one corner, one voice
      const played = stampNow(b, L, "right", right, row0 - 18, Math.round(cols * 0.45), ss, false);
      if (!played) {
        const role = ROLES[fi];
        b.stampInto(L.mask, role, right - measureCols(role), row0 - 10, 1);
      }
      b.stampInto(L.mask, hhs, col0, row0, s);
      if (reduced || ss % 2 === 0) b.stampInto(L.mask, ":", col0 + 12 * s, row0, s);
      b.stampInto(L.mask, mms, col0 + 14 * s, row0, s);
      b.stampInto(L.mask, dateStr, right - measureCols(dateStr), row0 + 7 * s + 3, 1);
    } else {
      const total = 50;
      const col0 = Math.round((cols - total) / 2);
      const row0 = rows - 40;
      const role = ROLES[fi];
      b.stampInto(L.mask, role, Math.round((cols - measureCols(role)) / 2), row0 - 10, 1);
      b.stampInto(L.mask, hhs, col0, row0, 2);
      if (reduced || ss % 2 === 0) b.stampInto(L.mask, ":", col0 + 24, row0, 2);
      b.stampInto(L.mask, mms, col0 + 28, row0, 2);
      b.stampInto(L.mask, dateStr, Math.round((cols - measureCols(dateStr)) / 2), row0 + 17, 1);
      if (row0 - 28 > Math.round(rows * 0.56)) stampNow(b, L, "center", Math.round(cols / 2), row0 - 28, cols - 8, ss, false);
    }
    b.haloOf(L);
  }

  /* ---------- the cyclist lapping the bottom of home ---------- */
  let play: Layer | null = null;

  function updatePlay(b: Board, t: number) {
    const L = (play ??= b.layer());
    const { cols, rows, wide, reduced } = b;
    const pm = L.mask;
    const on = current === "HOME" && wide && !reduced && b.winRow < 2; // he laps the first screen only
    if (!on) {
      if (L.key !== "off") { L.key = "off"; pm.fill(0); }
      return;
    }
    // endless laps along the bottom edge, passing behind the text;
    // phase-shifted so he's already riding in as the board boots
    const lap = cols + 48;
    const xo = (Math.floor(t * 8.5) + 30) % lap - 38;
    const ped = Math.floor(t * 4) % 2;
    const key = "cyc|" + xo + "|" + ped;
    if (key === L.key) return;
    L.key = key;
    pm.fill(0);
    const yb = rows - 17;
    const put = (x: number, y: number) => {
      const xi = Math.round(x), yi = Math.round(y);
      if (xi >= 0 && xi < cols && yi >= 0 && yi < rows) pm[yi * cols + xi] = 1;
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
    const cm = clock?.mask;
    if (cm) {
      for (let y = Math.max(0, yb - 2); y < Math.min(rows, yb + 16); y++)
        for (let x = Math.max(0, xo - 2); x < Math.min(cols, xo + 25); x++) {
          const i = y * cols + x;
          if (!pm[i]) continue;
          let near = false;
          for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && xx < cols && yy >= 0 && yy < rows && cm[yy * cols + xx]) { near = true; break; }
          }
          if (near) pm[i] = 0;
        }
    }
  }

  /* ---------- compositions ---------- */

  function composeHome(b: Board) {
    const { cols, rows, W, H, cw, chh, wide } = b;
    // the top line is pinned: it stays while the rest of the board scrolls beneath it
    const P = (pins ??= b.layer());
    P.mask.fill(0); P.key = "pins";
    b.pinnedRows = wide ? 12 : 22; // the top band the menu and the small mark live in
    b.extraLinks = b.extraLinks.filter((l) => !l.page.startsWith("PIN:"));
    {
      const right = wide ? Math.round(cols * 0.94) : cols - 3;
      const gap = 6;
      const total = NAV.reduce((s, w) => s + measureM(w) + gap, 0) - gap;
      let nx = wide ? right - total : 3;
      const ny = wide ? 3 : 13;
      for (const wd of NAV) { b.pinLink(P, wd, nx, ny, true, wd); nx += measureM(wd) + gap; }
      bandHalo(b, P, ny + 8);
    }
    if (wide) {
      const colL = Math.round(cols * 0.06);
      const right = Math.round(cols * 0.94);
      const cap = Math.min(H * 0.26, (W * 0.5) / 2.9);
      b.drawMark(cap, colL * cw, H * 0.4);
      if (portrait) {
        // the portrait holds the upper-right; while idle it waves now and then
        b.drawFace(portrait, W * 0.785, H * 0.375, 0.56);
        const fb = b.faceBox!;
        // click the portrait: the eyes go laser (a dot-board rendition of the meme)
        b.hotAt(fb.x0 * cw, fb.y0 * chh, (fb.x1 - fb.x0) * cw, (fb.y1 - fb.y0) * chh,
          "portrait", () => { laser.on = !laser.on; if (laser.on) buildLaser(b); });
        if (laser.on) buildLaser(b);
      }
      // an honest introduction, in the small face; it stays clear of the portrait
      const faceLeft = b.faceBox ? Math.floor(b.faceBox.x0) : cols;
      const mIntro = Math.min(Math.round(cols * 0.7), faceLeft - colL - 4);
      let irow = Math.round(rows * 0.5);
      for (const para of TXT.home) {
        for (const line of wrapM(para, mIntro)) {
          if (irow + 5 > rows - 36) break;
          b.stamp(line, colL, irow, 1, undefined, true);
          irow += 8;
        }
        irow += 4;
      }
      // LIFE: the page becomes the seed of Conway's automaton. it shares the clock's baseline
      b.stamp("LIFE", colL, rows - 26, 1, "LIFE");
    } else {
      const colL = 3;
      const titleTop = 13 + 14;
      const cap = Math.min(H * 0.14, (W * 0.88) / 2.9);
      b.drawMark(cap, colL * cw, (titleTop + 21) * chh);
      let irow = titleTop + 41;
      for (const para of TXT.homeNarrow) {
        for (const line of wrapM(para, cols - colL * 2)) {
          b.stamp(line, colL, irow, 1, undefined, true);
          irow += 8;
        }
        irow += 4;
      }
    }
    if (b.vrows > rows) composeBelow(b);
  }

  /** the pinned line's halo is a whole band: rows 0..to are cleared of whatever scrolls beneath */
  function bandHalo(b: Board, L: Layer, to: number) {
    b.haloOf(L);
    const h = L.halo!;
    for (let y = 0; y < Math.min(b.rows, to); y++) for (let x = 0; x < b.cols; x++) if (!L.mask[y * b.cols + x]) h[y * b.cols + x] = 1;
  }

  /* the screens below the fold: the ledger, then about. all in dots. */
  function composeBelow(b: Board) {
    const { cols, rows, wide } = b;
    const colL = wide ? Math.round(cols * 0.06) : 3;
    const right = wide ? Math.round(cols * 0.94) : cols - 3;
    const sc = wide ? 2 : 1;

    const S = sectionRows(rows, cols, (live?.ledger ?? []).length);
    // WORK
    let y = S.WORK + SECTION_PAD(wide);
    b.stamp("WORK", colL, y, sc * 2, undefined, false, true);
    const entries = live?.ledger ?? [];
    const G = tileGrid(rows, cols, entries.length);
    entries.forEach((e, i) => {
      const t = G.tiles[i];
      // the box: a single-dot border
      for (let x = t.x; x < t.x + t.w; x++) { b.block(x, t.y, 1, 1); b.block(x, t.y + t.h - 1, 1, 1); }
      for (let yy = t.y; yy < t.y + t.h; yy++) { b.block(t.x, yy, 1, 1); b.block(t.x + t.w - 1, yy, 1, 1); }
      const no = String(i + 1).padStart(2, "0");
      const specs = [e.state, "SINCE " + e.since, e.gen, e.pushed ? "PUSHED " + e.pushed : null].filter(Boolean) as string[];
      if (wide) {
        // the index, big, in the left of the box
        b.stamp(no, t.x + 6, t.y + Math.floor((t.h - 21) / 2), 3);
        const nx = t.x + 6 + measureCols(no) * 3 + 10, right = t.x + t.w - 5;
        let ly = t.y + 7;
        b.stamp(e.title.toUpperCase(), nx, ly, 2, entryLink(e.slug)); ly += 14 + 5;
        // one short line with some character; the one-liner lives on the entry
        const tag = (e.lines[0] || e.blurb).toUpperCase();
        for (const line of wrap(tag, 1, right - nx).slice(0, 1)) { b.stamp(line, nx, ly, 1); ly += 9; }
        // the bottom line: roadmap ticks left, the specs right, in the small face
        const by = t.y + t.h - 10;
        let spec = specs.join("   "), sw = measureM(spec);
        while (sw > right - nx - 40 && specs.length > 2) { specs.pop(); spec = specs.join("   "); sw = measureM(spec); }
        b.stamp(spec, right - sw, by, 1, undefined, true);
        if (e.roadmap && e.roadmap.total) {
          for (let k = 0; k < e.roadmap.total; k++) { const x = nx + k * 4; if (x + 2 > right - sw - 8) break; if (k < e.roadmap.done) b.block(x, by + 1, 2, 2); else b.block(x, by + 2, 1, 1); }
        }
      } else {
        b.stamp(no, t.x + 4, t.y + 5, 2);
        const nx = t.x + 4;
        let ly = t.y + 5 + 14 + 6;
        b.stamp(e.title.toUpperCase(), nx, ly, 1, entryLink(e.slug)); ly += 7 + 4;
        for (const line of wrapM((e.lines[0] || e.blurb).toUpperCase(), t.w - 8).slice(0, 2)) { b.stamp(line, nx, ly, 1, undefined, true); ly += 8; }
        ly += 3;
        for (const sp of specs) { b.stamp(sp, nx, ly, 1, undefined, true); ly += 8; }
      }
      const nameRec = b.links[b.links.length - 1];
      // the whole box is the link; hovering it lights the name
      const hot = b.hotAt(t.x * b.cw, t.y * b.chh, t.w * b.cw, t.h * b.chh, e.title.toLowerCase(), () => b.route(`/work/${e.slug}`), `/work/${e.slug}`);
      hot.addEventListener("mouseenter", () => { if (nameRec) { nameRec.hover = true; nameRec.since = performance.now() / 1000; } });
      hot.addEventListener("mouseleave", () => { if (nameRec) nameRec.hover = false; });
    });
    y = G.end;

    // ABOUT: plain lines, then the interests with the strike as the bullet
    y = S.ABOUT + SECTION_PAD(wide);
    b.stamp("ABOUT", colL, y, sc * 2, undefined, false, true);
    y += sc * 14 + 12;
    const measure = aboutMeasure(cols, wide), asc = aboutScale(wide), lh = asc * 7 + (asc > 1 ? 4 : 2);
    for (const para of ABOUT_LINES) {
      for (const line of wrap(para, asc, measure)) { b.stamp(line, colL, y, asc); y += lh; }
      y += 4;
    }
    // the interests: one small run, so the section breathes
    y += 8;
    for (const line of wrap(ABOUT_INTERESTS_LABEL, 1, measure)) { b.stamp(line, colL, y, 1); y += 9; }
    y += 1;
    for (const line of wrap(ABOUT_INTERESTS.join(" / "), 1, measure)) { b.stamp(line, colL, y, 1); y += 9; }
    y += 12;
    b.stamp(live?.place || "BROOKLYN, NY", colL, y, 1); y += 10;
    b.stamp("EMAIL", colL, y, 1, "EMAIL", true, true);
    b.stamp("GITHUB", colL + measureM("EMAIL") + 8, y, 1, "GITHUB", true, true);
  }

  // the masthead: mark left, menu right, clock in the middle (from the layer)
  function composeStrip(b: Board, section: string) {
    const { cols, rows } = b;
    const row = Math.round((rows - 5) / 2);
    b.stamp("KJEL.", 3, row, 1, "HOME", true);
    const gap = 6;
    const total = NAV.reduce((s, w) => s + measureM(w) + gap, 0) - gap;
    let nx = cols - 3 - total;
    for (const wd of NAV) {
      if (wd === section) { b.marker(nx - 4, row + 1); b.stamp(wd, nx, row, 1, undefined, true); }
      else b.stamp(wd, nx, row, 1, wd, true);
      nx += measureM(wd) + gap;
    }
  }

  /* ---------- an entry: one screen for one project ---------- */
  /** the entry's layout, so its height is known before compose: rows for each part */
  function entryLayout(rows: number, cols: number, e: Entry) {
    const wide = cols / rows > 1.05;
    const colL = wide ? Math.round(cols * 0.06) : 3, sc = wide ? 3 : 2;
    // the text column stops short of the big number on the right
    const measure = wide ? Math.round(cols * 0.55) : cols - 6;
    const title = wrap(e.title.toUpperCase(), sc, wide ? Math.round(cols * 0.55) : cols - 6);
    const blurb = wrap(e.blurb.toUpperCase(), 1, measure);
    const fun = e.lines.flatMap((l) => wrapM(l, measure));
    const metaText = [e.state, "SINCE " + e.since, e.gen, e.pushed ? "PUSHED " + e.pushed : null].filter(Boolean).join("  ");
    const meta = wrapM(metaText, measure);
    let y = wide ? Math.round(rows * 0.1) : 30;
    const yTitle = y; y += title.length * (sc * 7 + 4) + 6;
    const yMeta = y; y += meta.length * 8 + 6;
    const yBlurb = y; y += blurb.length * 9 + 6;
    const yFun = y; y += fun.length * 8 + 10;
    const yLinks = y; y += 7 + 14;
    return { wide, colL, sc, measure, title, blurb, fun, meta, yTitle, yMeta, yBlurb, yFun, yLinks, height: y };
  }

  function composeEntry(b: Board, slug: string) {
    const { cols, rows, wide } = b;
    const e = live?.ledger.find((x) => x.slug === slug);
    // the pinned line: a small mark home, the menu
    const P = (pins ??= b.layer());
    P.mask.fill(0); P.key = "pins";
    b.extraLinks = b.extraLinks.filter((l) => !l.page.startsWith("PIN:"));
    b.pinnedRows = wide ? 12 : 22;
    {
      const right = wide ? Math.round(cols * 0.94) : cols - 3, gap = 6;
      const total = NAV.reduce((s, w) => s + measureM(w) + gap, 0) - gap;
      let nx = wide ? right - total : 3; const ny = wide ? 3 : 13;
      b.pinLink(P, "KJEL.", 3, 3, true, "HOME");
      for (const wd of NAV) { b.pinLink(P, wd, nx, ny, true, wd); nx += measureM(wd) + gap; }
      bandHalo(b, P, b.pinnedRows);
    }
    if (!e) { b.stamp("NOTHING HERE", 3, Math.round(rows * 0.4), 2); return; }
    const L = entryLayout(rows, cols, e);
    const { colL, sc } = L;
    let y = L.yTitle;
    // the name
    for (const line of L.title) { b.stamp(line, colL, y, sc, undefined, false, true); y += sc * 7 + 4; }
    // the meta line, wrapped when the board is narrow
    y = L.yMeta; for (const m of L.meta) { b.stamp(m, colL, y, 1, undefined, true); y += 8; }
    // the one-liner
    y = L.yBlurb; for (const line of L.blurb) { b.stamp(line, colL, y, 1); y += 9; }
    // the short lines, in the small face
    y = L.yFun; for (const l of L.fun) { b.stamp(l, colL, y, 1, undefined, true); y += 8; }
    // the entry's number, large, where the portrait sits on the landing
    {
      const idx = live?.ledger.findIndex((x) => x.slug === slug) ?? -1;
      const no = String(idx + 1).padStart(2, "0"), nsc = wide ? 6 : 3;
      const w = measureCols(no) * nsc;
      if (wide) b.stamp(no, Math.round(cols * 0.78) - Math.floor(w / 2), Math.round(rows * 0.4) - Math.floor(7 * nsc / 2), nsc);
      else if (L.title.length === 1 && colL + measureCols(L.title[0]) * sc + 6 + w <= cols - 3) b.stamp(no, cols - 3 - w, L.yTitle, nsc);
    }
    // links follow the text
    const ly = L.yLinks; let lx = colL;
    if (e.repo) { b.stamp("README", lx, ly, 1, "README", true, true); lx += measureM("README") + 8; }
    if (e.site) { b.stamp("SITE", lx, ly, 1, "SITE", true, true); lx += measureM("SITE") + 8; }
    b.stamp("ALL WORK", lx, ly, 1, "WORK", true, true);
    // the roadmap as ticks under the lifeform: done are blocks, open are single dots
    if (e.roadmap && e.roadmap.total && wide) {
      const n = e.roadmap.total, tw = n * 4 - 2, tx = Math.round(cols * 0.78) - Math.floor(tw / 2), ty = Math.round(rows * 0.4) + 21 + 8;
      for (let i = 0; i < n; i++) { const x = tx + i * 4; if (x < 0 || x + 2 > cols) continue; if (i < e.roadmap.done) b.block(x, ty, 2, 2); else b.block(x, ty + 1, 1, 1); }
      const lbl = `${String(e.roadmap.done).padStart(2, "0")}/${String(e.roadmap.total).padStart(2, "0")}`;
      b.stamp(lbl, Math.round(cols * 0.78) - Math.floor(measureM(lbl) / 2), ty + 6, 1, undefined, true);
    }
    external.README = e.repo ? `https://github.com/${e.repo}#readme` : "";
    external.SITE = e.site || "";
  }

  function compose(b: Board, page: string) {
    current = page;
    b.fx = laser;
    if (page !== "HOME") { laser.on = false; laser.p = 0; laser.mask = null; }
    if (page === "HOME") composeHome(b);
    else if (page.startsWith("ENTRY:")) composeEntry(b, page.slice(6));
    else composeStrip(b, page.split(":")[1] || "");
  }

  /* ---------- menu previews: hover a section, the board says what's there ---------- */
  let preview: Layer | null = null;

  function updatePreview(b: Board) {
    const L = (preview ??= b.layer());
    const { cols, rows, wide } = b;
    if (current !== "HOME" || !wide) { if (L.key !== "off") { L.key = "off"; L.mask.fill(0); } return; }
    const hot = b.extraLinks.find((l) => l.hover && l.page.startsWith("PIN:") && NAV.includes(l.page.slice(4)));
    const key = hot ? hot.page.slice(4) : "none";
    if (key === L.key) return;
    L.key = key;
    L.mask.fill(0);
    if (!hot) return;
    const text = key === "WORK"
      ? (live ? `${live.entries} ENTRIES` + (live.pushed ? ` · PUSHED ${live.pushed}` : "") : "THE LEDGER")
      : (live?.place || "BROOKLYN, NY");
    // to the left of the menu, on its line, so it never touches the portrait
    const right = Math.round(cols * 0.94);
    const gap = 6;
    const menuW = NAV.reduce((a, wd) => a + measureM(wd) + gap, 0) - gap;
    const w = measureM(text);
    b.stampInto(L.mask, text, Math.max(0, right - menuW - 10 - w), 3, 1, true);
    b.haloOf(L);
  }

  /* ---------- life: the word stays lit and says what is happening ---------- */
  let lifeL: Layer | null = null;
  function updateLife(b: Board) {
    const L = (lifeL ??= b.layer());
    const on = !!b.life && current === "HOME" && b.wide;
    if (!on) { if (L.key !== "off") { L.key = "off"; L.mask.fill(0); L.halo = null; } return; }
    if (L.key === "on") return;
    L.key = "on";
    L.mask.fill(0);
    const { cols, rows } = b, colL = Math.round(cols * 0.06);
    // the note sits above the word, clear of the clock on the right
    const lines = wrapM("CONWAY'S GAME OF LIFE, SEEDED FROM THIS PAGE. THE CURSOR SOWS. CLICK LIFE OR ESC TO STOP.", Math.round(cols * 0.5) - colL);
    let y = rows - 26 - 4 - lines.length * 7;
    for (const line of lines) { b.stampInto(L.mask, line, colL, y, 1, true); y += 7; }
    b.stampInto(L.mask, "LIFE", colL, rows - 26, 1);
    b.haloOf(L);
  }

  let markPinned = false;
  function updateMark(b: Board) {
    // once the big mark has scrolled off, a small KJEL. takes the top-left, a link back to the top
    const want = current === "HOME" && b.winRow > Math.round(b.rows * 0.3);
    if (want === markPinned || !pins) return;
    markPinned = want;
    if (want) { b.pinLink(pins, "KJEL.", 3, 3, true, "HOME"); bandHalo(b, pins, b.wide ? 11 : 21); }
    else b.compose(); // rebuild the pins without it
  }

  function tick(b: Board, t: number) {
    updateClock(b, t);
    updatePlay(b, t);
    updatePreview(b);
    updateMark(b);
    updateLife(b);
  }

  /** fetch the portrait, then recompose and deal the board in */
  function load(b: Board) {
    loadPortrait("/kjel-board.jpg", (p) => {
      portrait = p;
      b.compose();
      b.boot();
    });
  }

  function destroy() {
    window.clearInterval(nowTimer);
  }

  return {
    compose, tick, load, destroy, external,
    actions: { LIFE: (b: Board) => b.toggleLife() } as Record<string, (b: Board) => void>,
    rows: (W: number, H: number) => (W / H > 1.05 ? 141 : 153),
    /** total rows of the tall landing: home, the ledger, then what about needs */
    height: (rows: number, cols: number) => sectionRows(rows, cols, (live?.ledger ?? []).length).ABOUT + Math.max(rows, aboutRows(cols, cols / rows > 1.05)),
    isHome: () => current === "HOME",
    /** rows an entry needs: at least a screen, more if the text runs long */
    entryHeight: (rows: number, cols: number, slug: string) => { const e = live?.ledger.find((x) => x.slug === slug); return e ? Math.max(rows, entryLayout(rows, cols, e).height) : rows; },
    sections: (rows: number, cols: number) => sectionRows(rows, cols, (live?.ledger ?? []).length),
  };
}
