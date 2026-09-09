"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BOARD_DEFAULTS, type BoardText } from "@/lib/board-text";
import { Board } from "./board/engine";
import { createKjelScene, NAV, STRIP_ROWS, STRIP_H, ROUTES, sectionFor } from "./board/scenes/kjel";

type Mode = "full" | "strip";
const modeFor = (path: string): Mode => (path === "/" ? "full" : "strip");

// One board for the whole site. On "/" it fills the viewport; on every other
// route it is the masthead strip and the HTML content sits beneath it.
// Leaving the landing: the dots wipe off, the route changes, the canvas
// shrinks to the strip, the strip deals in, the content rises. Coming back
// reverses it.
export function BoardShell({ text, children }: { text?: BoardText; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hotsRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<Board | null>(null);
  const modeRef = useRef<Mode>(modeFor(pathname));
  const pathRef = useRef(pathname);
  const transitRef = useRef(false);
  const textRef = useRef(text);
  const [mode, setMode] = useState<Mode>(modeFor(pathname));
  const [ready, setReady] = useState(false);

  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);

  // build the board once
  useEffect(() => {
    const scene = createKjelScene(textRef.current || BOARD_DEFAULTS);
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
      compose: (b) => scene.compose(b, modeRef.current === "full" ? "HOME" : "STRIP:" + sectionFor(pathRef.current)),
      tick: scene.tick,
      external: scene.external,
      routes: ROUTES,
      onRoute: (path) => {
        if (path === pathRef.current) return;
        board.wipeOut().then(() => router.push(path));
      },
    });
    boardRef.current = board;
    board.resize();
    scene.load(board);
    board.start();
    // enable the height transition only after first paint
    const raf = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(raf);
      board.destroy();
      scene.destroy();
      boardRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // body scroll belongs to the content layer only
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = mode === "full" ? "hidden" : "";
    return () => { document.body.style.overflow = prev; };
  }, [mode]);

  // route changed: reshape the board when the canvas has finished resizing
  useEffect(() => {
    const next = modeFor(pathname);
    const board = boardRef.current;
    const canvas = canvasRef.current;
    if (!board || !canvas) return;
    if (next === modeRef.current) {
      // same shape, different section (strip → strip): just recompose with a wipe
      if (next === "strip") { board.compose(); board.boot(); }
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
      <div ref={hotsRef} />
      <main id="main" className="fd-main" hidden={mode === "full"} key={pathname} tabIndex={-1}>
        {children}
      </main>
    </>
  );
}

export { NAV };
