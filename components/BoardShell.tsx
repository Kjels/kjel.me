"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BOARD_DEFAULTS, type BoardText } from "@/lib/board-text";
import { Board } from "./board/engine";
import { GlassCard } from "./GlassCard";
import { AccentPicker } from "./AccentPicker";
import { initAccent } from "./board/palette";
import { createKjelScene, NAV, STRIP_ROWS, STRIP_H, ROUTES, SCREENS, entryLink, sectionFor, type Live } from "./board/scenes/kjel";

type Mode = "full" | "strip";
// the landing and the entries are boards; everything else (config) sits under the strip
const modeFor = (path: string): Mode => (path === "/" || path.startsWith("/work/") ? "full" : "strip");
const pageFor = (path: string) => (path === "/" ? "HOME" : path.startsWith("/work/") ? "ENTRY:" + path.split("/")[2] : "STRIP:" + sectionFor(path));

// One board for the whole site. On "/" it fills the viewport; on every other
// route it is the masthead strip and the HTML content sits beneath it.
// Leaving the landing: the dots wipe off, the route changes, the canvas
// shrinks to the strip, the strip deals in, the content rises. Coming back
// reverses it.
export function BoardShell({ text, live, children }: { text?: BoardText; live?: Live; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hotsRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<Board | null>(null);
  const modeRef = useRef<Mode>(modeFor(pathname));
  const pathRef = useRef(pathname);
  const transitRef = useRef(false);
  // scroll position per path, so Back returns you to where you were on the board
  const posRef = useRef<Record<string, number>>({});
  const popRef = useRef(false);
  // a scroll to apply once the page has its height (the spacer is sized after fit)
  const pendingRef = useRef<number | null>(null);
  const textRef = useRef(text);
  const liveRef = useRef(live);
  const [mode, setMode] = useState<Mode>(modeFor(pathname));
  const [ready, setReady] = useState(false);
  const [docHeight, setDocHeight] = useState(0);
  // an HTML card over the board, opened by the scene (WHAT IS THIS) and closed by the reader
  const [card, setCard] = useState<string | null>(null);
  // the accent sandbox: A opens it, ?accent=hex or localStorage set the colour on load
  const [picker, setPicker] = useState(false);
  useEffect(() => {
    initAccent();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "a" && e.key !== "A") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      setPicker((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // ?scroll=snap makes the tall landing settle on whole screens; default is free, row-stepped scrolling
  const [snap] = useState(() => typeof location !== "undefined" && new URLSearchParams(location.search).get("scroll") === "snap");

  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);
  useEffect(() => {
    const onScroll = () => { posRef.current[pathRef.current] = window.scrollY; };
    const onPop = () => { popRef.current = true; };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("popstate", onPop);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("popstate", onPop); };
  }, []);

  // build the board once
  useEffect(() => {
    const scene = createKjelScene(textRef.current || BOARD_DEFAULTS, liveRef.current);
    const routes: Record<string, string> = { ...ROUTES };
    for (const e of liveRef.current?.ledger ?? []) routes[entryLink(e.slug)] = `/work/${e.slug}`;
    const board = new Board({
      canvas: canvasRef.current!,
      hots: hotsRef.current!,
      rows: (W, H) => {
        if (transitRef.current) {
          // mid-resize: interpolate the dot pitch between the two shapes so the
          // sign gains or loses rows as it opens or closes, dots staying round
          const fullH = window.innerHeight;
          const pStrip = STRIP_H / STRIP_ROWS, pFull = fullH / scene.rows(W, fullH);
          const p = Math.min(1, Math.max(0, (H - STRIP_H) / Math.max(1, fullH - STRIP_H)));
          return Math.round(H / (pStrip + p * (pFull - pStrip)));
        }
        return modeRef.current === "full" ? scene.rows(W, H) : STRIP_ROWS;
      },
      // the landing is three screens tall; every other page is exactly the strip
      // only the landing is tall
      virtualRows: (rows, cols) => {
        if (modeRef.current !== "full" || transitRef.current) return rows;
        const path = pathRef.current;
        if (path === "/") return scene.height(rows, cols);
        if (path.startsWith("/work/")) return scene.entryHeight(rows, cols, path.split("/")[2]);
        return rows;
      },
      scrollOffset: () => window.scrollY,
      onFit: (b) => {
        setDocHeight(b.vrows > b.rows ? Math.round(b.vrows * b.chh) : 0);
        document.documentElement.style.setProperty("--dot", `${b.cw}px`); // the board's pitch, for dot text in HTML
      },
      compose: (b) => scene.compose(b, modeRef.current === "full" ? pageFor(pathRef.current) : "STRIP:" + sectionFor(pathRef.current)),
      tick: scene.tick,
      external: scene.external,
      actions: scene.actions,
      onCard: setCard,
      routes,
      onRoute: (path) => {
        board.stopLife(); // leaving by any link leaves Life first
        // on the landing, WORK and ABOUT are sections of the board: scroll to them
        if (pathRef.current === "/") {
          const S = scene.sections(board.rows, board.cols);
          const row = path === "/" ? S.HOME : path === "/work" ? S.WORK : path === "/about" ? S.ABOUT : -1;
          if (row >= 0) { window.scrollTo({ top: row * board.chh, behavior: board.reduced ? "auto" : "smooth" }); return; }
        }
        if (path === pathRef.current) return;
        // board to board: just change route, the page effect flips the sign. board to page: wipe first
        if (modeFor(path) === "full" && modeRef.current === "full") { router.push(path.replace(/^\/(work|about)$/, "/#$1"), { scroll: false }); return; }
        board.wipeOut().then(() => router.push(path, { scroll: false }));
      },
    });
    boardRef.current = board;
    board.resize();
    scene.load(board);
    board.start();
    // /#work and /#about land on their sections, once the page has its height
    const toHash = () => {
      if (pathRef.current !== "/") return;
      const h = location.hash.slice(1).toUpperCase();
      const S = scene.sections(board.rows, board.cols) as Record<string, number>;
      if (h in S) pendingRef.current = S[h] * board.chh;
    };
    if (location.hash) toHash(); else pendingRef.current = null;
    window.addEventListener("hashchange", toHash);
    // enable the height transition only after first paint
    const raf = requestAnimationFrame(() => setReady(true));
    return () => {
      window.removeEventListener("hashchange", toHash);
      cancelAnimationFrame(raf);
      board.destroy();
      scene.destroy();
      boardRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the landing scrolls its own tall board; snap mode settles on whole screens
  useEffect(() => {
    document.documentElement.classList.toggle("fd-snap", mode === "full" && snap);
    return () => { document.documentElement.classList.remove("fd-snap"); };
  }, [mode, snap]);

  // once the spacer has a height, apply whatever scroll was waiting: a restored position or a hash
  useEffect(() => {
    if (docHeight <= 0 || pendingRef.current === null) return;
    const board = boardRef.current;
    let top = pendingRef.current;
    if (top === -1 && board) {
      const h = location.hash.slice(1).toUpperCase();
      const S = (boardRef.current ? (createKjelScene(textRef.current || BOARD_DEFAULTS, liveRef.current).sections(board.rows, board.cols)) : {}) as Record<string, number>;
      top = h in S ? S[h] * board.chh : 0;
    }
    pendingRef.current = null;
    window.scrollTo(0, Math.max(0, top));
  }, [docHeight]);

  // route changed: reshape the board when the canvas has finished resizing
  useEffect(() => {
    const next = modeFor(pathname);
    const board = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas) return;
    if (next === modeRef.current) {
      // same shape, different page: rebuild (the landing is tall, an entry is not) and deal it in.
      // arriving by Back restores where you were; arriving by a link starts at the top (or the hash)
      const back = popRef.current; popRef.current = false;
      const saved = back ? posRef.current[pathname] : undefined;
      pendingRef.current = saved ?? (pathname === "/" && location.hash ? -1 : 0); // -1: the hash decides
      board.resize();
      board.boot();
      return;
    }
    modeRef.current = next;
    setMode(next);
    // the canvas height animates in CSS; refit the empty grid to it every frame
    transitRef.current = true;
    let raf = requestAnimationFrame(function step() { board.blankResize(); raf = requestAnimationFrame(step); });
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("transitionend", finish);
      window.clearTimeout(timer);
      transitRef.current = false;
      board.resize();
      board.boot();
    };
    canvas.addEventListener("transitionend", finish);
    const timer = window.setTimeout(finish, 450);
    return () => { cancelAnimationFrame(raf); canvas.removeEventListener("transitionend", finish); window.clearTimeout(timer); transitRef.current = false; };
  }, [pathname]);

  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <canvas
        ref={canvasRef}
        className="fd-canvas"
        data-mode={mode}
        data-ready={ready ? "" : undefined}
        aria-label={mode === "full"
          ? "kjel.me: the landing is a flip-dot display. Links to work and about are laid over it."
          : "kjel.me masthead, a flip-dot strip with the clock and navigation."}
      />
      <div ref={hotsRef} className="fd-hots" />
      <GlassCard id={card} onClose={() => { boardRef.current ? boardRef.current.card(null) : setCard(null); }} />
      {picker && <AccentPicker onClose={() => setPicker(false)} />}
      {mode === "full" && docHeight > 0 && (
        <div className="fd-scroll" style={{ height: docHeight }} aria-hidden>
          {snap && Array.from({ length: SCREENS }, (_, i) => <div key={i} className="fd-snap-point" />)}
        </div>
      )}
      <main id="main" className="fd-main" hidden={mode === "full"} key={pathname} tabIndex={-1}>
        {children}
      </main>
    </>
  );
}

export { NAV };
