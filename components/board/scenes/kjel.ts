// The kjel.me scene: what the board actually shows. Two compositions: HOME,
// the full landing with the mark, the portrait, the intro, the clock and the
// cyclist; and STRIP, the masthead over every HTML page. Plus the layers
// that move: clock and role, now-playing, the cyclist, the laser eyes.
// The engine knows none of this.

import type { BoardText } from "@/lib/board-text";
import { Board, type Layer, type LinkRec } from "../engine";
import { DS, measureCols, measureM, wrap, wrapM, fit } from "../font";
import { loadPortrait } from "../portrait";
import { SEEDS } from "../pictos";

/** one line of the ledger, as the landing shows it */
export type Entry = { slug: string; title: string; state: string; since: string };
/** what the ledger knows right now, for the landing's live line, menu previews and the in-board ledger */
export type Live = { building: string; pushed: string; entries: number; place: string; ledger: Entry[] };

/** the landing is three sections tall: home, work, about. home and work are a screen each; about takes what it needs */
export const SCREENS = 3;
/** the section a menu word scrolls to, in screens */
export const SECTION: Record<string, number> = { HOME: 0, WORK: 1, ABOUT: 2 };
/** rows per ledger entry, and the rows above the first entry (title and air) */
const PER = 22, WORK_HEAD = 14 + 28 + 12;
/** where each section starts, in rows, for a board of this shape with n entries */
export function sectionRows(rows: number, cols: number, n: number) {
  const wide = cols / rows > 1.05;
  const work = rows;
  const workRows = (wide ? WORK_HEAD : 14 + 14 + 12) + n * PER + 12;
  const about = work + Math.max(rows, workRows);
  return { HOME: 0, WORK: work, ABOUT: about };
}
/** route name for an entry link on the board */
export const entryLink = (slug: string) => "ENTRY:" + slug;

const ABOUT_LINES = [
  "I BUILD SMALL SOFTWARE AND THE OCCASIONAL APPLIANCE.",
  "RIGHT NOW: A KITCHEN SCALE WITH A SCREEN IN IT, A TMUX WORKSPACE THAT FOLLOWS ME BETWEEN MACHINES, AND THIS SIGN.",
  "BY DAY I DESIGN THE OUTBOUND ENGINE AT HACKAJOB.",
  "ROWER TURNED RUNNER. FIXED GEAR. BOARD GAMES THAT TAKE A WHOLE EVENING.",
];
const aboutMeasure = (cols: number, wide: boolean) => (wide ? Math.round(cols * 0.62) : cols - 6);
/** rows the about section needs: title, lines, place, links, air */
function aboutRows(cols: number, wide: boolean) {
  let n = 14 + 28 + 12;
  for (const para of ABOUT_LINES) n += wrap(para, 1, aboutMeasure(cols, wide)).length * 9 + 6;
  return n + 4 + 10 + 7 + 24;
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
  let wave: HTMLCanvasElement | null = null;
  let waving = false;
  // idle: after this many seconds without input the portrait waves, once every so often
  const IDLE_AFTER = (() => { try { const q = parseFloat(new URLSearchParams(location.search).get("idle") || ""); return q > 0 ? q : 15; } catch { return 15; } })();

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
    const scrolled = b.winRow > Math.round(rows * 0.3);
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
      const row = current === "HOME" ? 3 : Math.round((rows - 5) / 2);
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
        const room = cols - 3 - navW - 10 - (x + measureM(mms) + 10);
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
        b.drawFace(waving && wave ? wave : portrait, W * 0.785, H * 0.375, 0.56);
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
      // the live line: what the ledger is building, and when it last moved.
      // it shares the clock's baseline; the cyclist passes beneath it.
      if (live?.building) {
        b.stamp("NOW BUILDING", colL, rows - 33, 1, undefined, true);
        const w = b.stamp(live.building, colL, rows - 26, 1, "WORK");
        if (live.pushed) b.stamp("PUSHED " + live.pushed, colL + w + 6, rows - 25, 1, undefined, true);
      }
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
    let y = S.WORK + 14;
    b.stamp("WORK", colL, y, sc * 2, undefined, false, true);
    y += sc * 14 + 12;
    const entries = live?.ledger ?? [];
    entries.forEach((e, i) => {
      const top = y + i * PER;
      // the lifeform, still, as a mark
      const seed = SEEDS[e.slug];
      if (seed) for (let r = 0; r < seed.length; r++) for (let c = 0; c < seed[r].length; c++) if (seed[r][c] === "1") b.block(colL + c * 2, top + 2 + r * 2, 2, 2);
      const nx = colL + 14;
      // long names wrap on narrow boards rather than running off the edge
      const lines = wrap(e.title.toUpperCase(), sc, cols - nx - 3);
      let w = 0, ly = top;
      for (const line of lines) { w = Math.max(w, b.stamp(line, nx, ly, sc, entryLink(e.slug))); ly += sc * 7 + 2; }
      // state and date share the name's line, right-aligned when there is room
      const meta = `${e.state}  ${e.since}`;
      const mw = measureCols(meta);
      if (wide && right - mw > nx + w + 6) b.stamp(meta, right - mw, top + (sc * 7 - 7), 1);
      else b.stamp(meta, nx, ly, 1, undefined, true);
    });

    // ABOUT
    y = S.ABOUT + 14;
    b.stamp("ABOUT", colL, y, sc * 2, undefined, false, true);
    y += sc * 14 + 12;
    const measure = aboutMeasure(cols, wide);
    for (const para of ABOUT_LINES) {
      for (const line of wrap(para, 1, measure)) { b.stamp(line, colL, y, 1); y += 9; }
      y += 6;
    }
    y += 4;
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

  function compose(b: Board, page: string) {
    current = page;
    b.fx = laser;
    if (page !== "HOME") { laser.on = false; laser.p = 0; laser.mask = null; }
    if (page === "HOME") composeHome(b);
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

  /* ---------- idle: the portrait waves ---------- */
  function updateIdle(b: Board, t: number) {
    if (current !== "HOME" || !wave || b.reduced) return;
    const idle = t - b.lastInput;
    // once idle, wave for 1.4s every 12s
    const shouldWave = idle > IDLE_AFTER && ((idle - IDLE_AFTER) % 12) < 1.4;
    if (shouldWave !== waving) { waving = shouldWave; b.compose(); }
  }

  let markPinned = false;
  function updateMark(b: Board) {
    // once the big mark has scrolled off, a small KJEL. takes the top-left, a link back to the top
    const want = current === "HOME" && b.winRow > Math.round(b.rows * 0.3);
    if (want === markPinned || !pins) return;
    markPinned = want;
    if (want) { b.pinLink(pins, "KJEL.", 3, 3, true, "HOME"); bandHalo(b, pins, 11); }
    else b.compose(); // rebuild the pins without it
  }

  function tick(b: Board, t: number) {
    updateClock(b, t);
    updatePlay(b, t);
    updatePreview(b);
    updateIdle(b, t);
    updateMark(b);
  }

  /** fetch the portrait, then recompose and deal the board in */
  function load(b: Board) {
    loadPortrait("/kjel-board.jpg", (p) => {
      portrait = p;
      b.compose();
      b.boot();
      // the waving frame loads after; nothing waits on it
      loadPortrait("/kjel-board-wave.jpg", (w) => { wave = w; });
    });
  }

  function destroy() {
    window.clearInterval(nowTimer);
  }

  return {
    compose, tick, load, destroy, external,
    rows: (W: number, H: number) => (W / H > 1.05 ? 141 : 153),
    /** total rows of the tall landing: home, the ledger, then what about needs */
    height: (rows: number, cols: number) => sectionRows(rows, cols, (live?.ledger ?? []).length).ABOUT + Math.max(rows, aboutRows(cols, cols / rows > 1.05)),
    sections: (rows: number, cols: number) => sectionRows(rows, cols, (live?.ledger ?? []).length),
  };
}
