"use client";

import { useEffect, useRef } from "react";
import { glyph, glyphM, measureCols, measureM } from "./board/font";
import { ON } from "./board/palette";

// Text in the sign's own face, drawn as dots on a small canvas. The pitch follows the board's
// (--dot, set by the shell on every fit), so a word here is the same size as the same word out there.
export function DotText({ text, micro = false, color = ON, pitch, scale = 1, className }: {
  text: string; micro?: boolean; color?: string; pitch?: number; scale?: number; className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const p = (pitch ?? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dot")) || 6)) * scale;
      const cols = micro ? measureM(text) : measureCols(text), rows = micro ? 5 : 7;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.ceil(cols * p * dpr); c.height = Math.ceil(rows * p * dpr);
      c.style.width = `${cols * p}px`; c.style.height = `${rows * p}px`;
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = color;
      let cx = 0;
      for (const ch of text.toUpperCase()) {
        const g = (micro ? glyphM : glyph)(ch);
        for (let r = 0; r < g.length; r++) for (let k = 0; k < g[r].length; k++) {
          if (g[r][k] !== "1") continue;
          ctx.beginPath();
          ctx.ellipse((cx + k) * p + p / 2, r * p + p / 2, p * 0.42, p * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        cx += g[0].length + 1;
      }
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [text, micro, color, pitch, scale]);
  return (
    <span className={className}>
      <canvas ref={ref} aria-hidden />
      <span className="sr-only">{text}</span>
    </span>
  );
}
