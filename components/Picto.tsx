"use client";

import { useEffect, useRef } from "react";
import { Board } from "./board/engine";
import { PICTOS, SIZE } from "./board/pictos";

// One project's mark: a lifeform on a small torus of standalone dots, no unlit layer.
// Steps a little faster while hovered or focused.
export function Picto({ slug, className }: { slug: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const picto = PICTOS[slug];
    const canvas = canvasRef.current!, host = hostRef.current!;
    if (!picto) return;
    const hots = document.createElement("div");
    let clock = 0, last = -1;
    const board = new Board({
      canvas,
      hots,
      grid: false,
      rows: () => SIZE, // always the torus; the box sets the pitch
      compose: () => {},
      tick: (b, t) => {
        // the pictogram's own clock: it runs at a quarter speed until the cell is live
        const dt = last < 0 ? 0 : Math.min(0.1, t - last);
        last = t;
        const live = host.matches(":hover, :focus-within") || host.dataset.live !== undefined;
        clock += dt * (b.reduced ? 0 : live ? 2 : 1);
        const L = b.layers[0] ?? b.layer();
        L.mask.fill(0);
        picto(b, L, clock);
      },
    });
    board.cursorMode = 0; // the cursor trail belongs to the landing
    board.resize();
    board.start();
    const ro = new ResizeObserver(() => board.resize());
    ro.observe(canvas);
    return () => { ro.disconnect(); board.destroy(); };
  }, [slug]);

  return (
    <div ref={hostRef} className={className}>
      <div className="picto-host">
        <canvas ref={canvasRef} className="picto" aria-hidden />
      </div>
    </div>
  );
}
