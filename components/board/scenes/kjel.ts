// The kjel.me scene: what the board actually shows. Menu, home with the mark
// and portrait, text pages, the clock + role + now-playing layer, the cyclist
// and the glider, and the laser eyes. The engine knows none of this.

import type { BoardText } from "@/lib/board-text";
import { Board, type Layer, type LinkRec } from "../engine";
import { DS, measureCols, measureM, wrap, wrapM, fit } from "../font";
import { loadPortrait } from "../portrait";

export const NAV = ["WORK", "NOW", "ABOUT", "NOTES"];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// pupil positions as fractions of the portrait frame
const EYES: [number, number][] = [[0.386, 0.276], [0.55, 0.274]];

export function createKjelScene(TXT: BoardText) {
  const PAGES = TXT.pages;
  const ROLES = TXT.roles; // sequential, never random: a first visit reads the sane ones first
  const external: Record<string, string> = { LINKEDIN: TXT.linkedin, EMAIL: TXT.email };

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

  function updateClock(b: Board, t: number) {
    const L = (clock ??= b.layer());
    const { cols, rows, wide, reduced, page } = b;
    const fi = reduced ? 0 : Math.floor(t / 2.8) % ROLES.length;
    const key = page + "|" + ((Date.now() / 1000) | 0) + "|" + fi + "|" + nowTitle;
    if (key === L.key) return;
    L.key = key;
    L.mask.fill(0);
    const d = new Date();
    const hh = d.getHours(), mm = d.getMinutes(), ss = d.getSeconds();
    const hhs = String(hh).padStart(2, "0"), mms = String(mm).padStart(2, "0");
    if (page !== "HOME") {
      clearNowHot(b); // the announcement lives on home only
      // the board keeps its heartbeat on subpages
      if (!wide) { L.halo = null; return; }
      const r2 = Math.round(cols * 0.94);
      const mmX = r2 - measureCols(mms);
      b.stampInto(L.mask, mms, mmX, rows - 13, 1);
      const cX = mmX - 3;
      if (reduced || ss % 2 === 0) b.stampInto(L.mask, ":", cX, rows - 13, 1);
      b.stampInto(L.mask, hhs, cX - 2 - measureCols(hhs), rows - 13, 1);
      b.haloOf(L);
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

  /* ---------- the resident layer: a glider on subpages, the cyclist lapping home ---------- */
  let play: Layer | null = null;
  // the colophon: a lone glider walking a small torus beside the title on subpages
  let colA: Uint8Array | null = null, colGen = 0, colSeed = "";

  function updatePlay(b: Board, t: number) {
    const L = (play ??= b.layer());
    const { cols, rows, wide, reduced, page } = b;
    const pm = L.mask;
    if (page !== "HOME" && wide && !reduced) {
      const G = 9;
      const gen = Math.floor(t / 1.4);
      const key = "col|" + page + "|" + gen;
      if (key === L.key) return;
      L.key = key;
      pm.fill(0);
      if (!colA || colSeed !== page) {
        colA = new Uint8Array(G * G);
        for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++)
          if (DS.GLIDER[y][x] === "1") colA[(y + 1) * G + (x + 1)] = 1;
        colSeed = page; colGen = gen;
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
          if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) pm[yy * cols + xx] = 1;
        }
      return;
    }
    const on = page === "HOME" && wide && !reduced;
    if (!on) {
      if (L.key !== "off") { L.key = "off"; pm.fill(0); }
      return;
    }
    // the cyclist: endless laps along the bottom edge, passing behind the text;
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

  /* ---------- pages ---------- */

  function compose(b: Board, page: string) {
    const { cols, rows, W, H, cw, chh, wide } = b;
    b.fx = laser;
    if (page !== "HOME") { laser.on = false; laser.p = 0; laser.mask = null; }

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
          if (wd === page) { b.marker(nx - 4, menuRow + 1); b.stamp(wd, nx, menuRow, 1, undefined, true); }
          else b.stamp(wd, nx, menuRow, 1, wd, true);
          nx += measureM(wd) + gap;
        }
      }
      if (page === "HOME") {
        const cap = Math.min(H * 0.26, (W * 0.5) / 2.9);
        b.drawMark(cap, colL * cw, H * 0.4);
        if (portrait) {
          // the portrait holds the upper-right
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
            if (irow + 5 > rows - 24) break;
            b.stamp(line, colL, irow, 1, undefined, true);
            irow += 8;
          }
          irow += 4;
        }
      } else {
        b.stamp("KJEL.", colL, 3, 1, "HOME", true);
        b.stamp(page, colL, titleTop, 2, undefined, false, true); // the page word, quietly underlined
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
            if (bullets && head) { b.stampG(DS.SOLIDUS, contentCol, crow); head = false; }
            b.stamp(line, bullets ? contentCol + 8 : contentCol, crow, 1);
            crow += 9;
          }
        }
        return crow;
      };
      if (page === "ABOUT") {
        // place + contact anchor the lower-left corner
        b.stamp(TXT.place, colL, rows - 19, 1);
        b.stamp("LINKEDIN", colL, rows - 10, 1, "LINKEDIN", true, true);
        b.stamp("EMAIL", colL + measureM("LINKEDIN") + 6, rows - 10, 1, "EMAIL", true, true);
        flow(TXT.about, measure, rows - 21);
      } else if (page !== "HOME") {
        const end = flow(PAGES[page] || [], undefined, undefined, page === "WORK");
        if (page === "NOTES") b.stampSmiley(contentCol + 14, end + 20, 13, true);
      }
    } else {
      const colL = 3;
      // menu on top, wrapped in fixed slots; a lit block marks the current page
      let nx = colL, ny = 13;
      for (const wd of NAV) {
        const wc = measureM(wd);
        if (nx + wc > cols - 3) { nx = colL; ny += 9; }
        if (wd === page) { b.marker(Math.max(0, nx - 4), ny + 1); b.stamp(wd, nx, ny, 1, undefined, true); }
        else b.stamp(wd, nx, ny, 1, wd, true);
        nx += wc + 6;
      }
      const titleTop = ny + 14;
      const contentTop = titleTop + 21; // title cap + one body cap of air
      if (page === "HOME") {
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
      } else {
        b.stamp("KJEL.", colL, 3, 1, "HOME", true);
        b.stamp(page, colL, titleTop, 2, undefined, false, true);
      }
      if (page === "ABOUT") {
        const linksRow = rows - 10, placeRow = rows - 19;
        let crow = contentTop;
        for (const line of TXT.aboutNarrow) {
          if (!line) { crow += 9; continue; }
          if (crow + 7 > placeRow - 2) break;
          b.stamp(line, colL, crow, 1);
          crow += 9;
        }
        b.stamp(TXT.placeNarrow, colL, placeRow, 1);
        b.stamp("LINKEDIN", colL, linksRow, 1, "LINKEDIN", true, true);
        b.stamp("EMAIL", colL + measureM("LINKEDIN") + 6, linksRow, 1, "EMAIL", true, true);
      } else if (page !== "HOME") {
        let crow = contentTop;
        let head = true;
        const bullets = page === "WORK";
        for (const raw of PAGES[page] || []) {
          if (!raw) { crow += 9; head = true; continue; }
          for (const line of wrap(raw, 1, cols - colL * 2 - (bullets ? 8 : 0))) {
            if (crow + 7 > rows - 6) break;
            if (bullets && head) { b.stampG(DS.SOLIDUS, colL, crow); head = false; }
            b.stamp(line, bullets ? colL + 8 : colL, crow, 1);
            crow += 9;
          }
        }
        if (page === "NOTES" && crow + 30 < rows - 6) b.stampSmiley(colL + 12, crow + 16, 11, true);
      }
    }
  }

  function tick(b: Board, t: number) {
    updateClock(b, t);
    updatePlay(b, t);
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

  return { compose, tick, load, destroy, external, rows: (W: number, H: number) => (W / H > 1.05 ? 141 : 153) };
}

export const hashFor = (page: string) => (page === "HOME" ? "#" : "#" + page.toLowerCase());

export function pageFromHash(): string {
  let h = "";
  try { h = decodeURIComponent(location.hash.slice(1)).toLowerCase(); } catch { h = location.hash.slice(1).toLowerCase(); }
  if (!h) return "HOME";
  const up = h.toUpperCase();
  return NAV.includes(up) ? up : "HOME";
}
