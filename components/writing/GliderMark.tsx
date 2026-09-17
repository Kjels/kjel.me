"use client";

import { useEffect, useRef } from "react";
import { accentCSS } from "@/components/board/palette";

// M-07, the maker's mark: the Game of Life glider, rows 010 / 001 / 111, travelling down-right
// like the strike through the J. The identity is explicit that it is never rotated, so it is not
// run as a simulation here — it is a mark, held at its own phase. Only the lit dots are drawn,
// the way the engine renders a pictogram (grid: false), so it reads as a form and not a panel.
const G = [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]];

export function GliderMark() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const base = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dot")) || 6;
      const p = Math.max(15, base * 2.4); // the mark has a stated minimum of 15px a cell
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.ceil(3 * p * dpr); c.height = Math.ceil(3 * p * dpr);
      c.style.width = `${3 * p}px`; c.style.height = `${3 * p}px`;
      const ctx = c.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = accentCSS();
      for (const [y, x] of G) {
        ctx.beginPath();
        ctx.ellipse(x * p + p / 2, y * p + p / 2, p * 0.42, p * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    draw();
    window.addEventListener("resize", draw);
    const onAccent = () => draw();
    window.addEventListener("accent", onAccent);
    return () => { window.removeEventListener("resize", draw); window.removeEventListener("accent", onAccent); };
  }, []);
  return <canvas ref={ref} className="glider-mark" aria-hidden />;
}
