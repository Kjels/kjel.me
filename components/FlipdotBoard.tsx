"use client";

import { useEffect, useRef } from "react";
import { BOARD_DEFAULTS, type BoardText } from "@/lib/board-text";
import { Board } from "./board/engine";
import { BG, ON } from "./board/palette";
import { createKjelScene, hashFor, pageFromHash } from "./board/scenes/kjel";

// The landing: the whole viewport is one flip-dot board. This shell owns the
// canvas, the URL hash, and body scroll; the engine and the scene do the rest.
export function FlipdotBoard({ text }: { text?: BoardText }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hotsRef = useRef<HTMLDivElement>(null);
  const textRef = useRef(text);
  useEffect(() => { textRef.current = text; }, [text]);

  useEffect(() => {
    const scene = createKjelScene(textRef.current || BOARD_DEFAULTS);
    const board = new Board({
      canvas: canvasRef.current!,
      hots: hotsRef.current!,
      rows: scene.rows,
      compose: scene.compose,
      tick: scene.tick,
      external: scene.external,
      page: pageFromHash(),
      onNavigate: (page) => { try { history.pushState(null, "", hashFor(page)); } catch {} },
    });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onPop = () => board.navigate(pageFromHash(), true);
    window.addEventListener("popstate", onPop);

    board.resize();
    scene.load(board);
    board.start();

    return () => {
      window.removeEventListener("popstate", onPop);
      board.destroy();
      scene.destroy();
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
