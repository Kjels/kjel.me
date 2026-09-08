"use client";

import { useEffect, useRef } from "react";
import { Board } from "./board/engine";
import { PICTOS } from "./board/pictos";

// One project's pictogram: standalone dots on a small board with no grid.
// Steps a little faster while hovered or focused.
export function Picto({ slug, pitch = 12, className }: { slug: string; pitch?: number; className?: string }) {
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
      rows: (_W, H) => Math.max(4, Math.round(H / pitch)),
      compose: () => {},
      tick: (b, t) => {
        // the pictogram's own clock: it runs at a quarter speed until the cell is live
        const dt = last < 0 ? 0 : Math.min(0.1, t - last);
        last = t;
        const live = host.matches(":hover, :focus-within") || host.dataset.live !== undefined;
        clock += dt * (b.reduced ? 0 : live ? 1.6 : 1);
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
  }, [slug, pitch]);

  return (
    <div ref={hostRef} className={className}>
      <div className="picto-host">
        <canvas ref={canvasRef} className="picto" aria-hidden />
      </div>
    </div>
  );
}
