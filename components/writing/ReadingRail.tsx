"use client";

import { useEffect, useRef, useState } from "react";
import { ON } from "@/components/board/palette";
import type { Heading } from "@/lib/writing";

// Where you are in the piece and how far through, at the board's own pitch.
// Progress never touches React state: a scroll sets a ref and coalesces one frame of canvas work.
export function ReadingRail({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState("");
  const dots = useRef<HTMLCanvasElement>(null);
  const p = useRef(0);
  const queued = useRef(false);

  useEffect(() => {
    const c = dots.current;
    if (!c) return;
    const N = 24;
    const draw = () => {
      queued.current = false;
      const pitch = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dot")) || 6;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.ceil(N * pitch * dpr); c.height = Math.ceil(pitch * dpr);
      c.style.width = `${N * pitch}px`; c.style.height = `${pitch}px`;
      const ctx = c.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const lit = Math.max(1, Math.round(p.current * N)); // a board is never wholly dark
      for (let i = 0; i < N; i++) {
        ctx.fillStyle = i < lit ? ON : "#242424";
        ctx.beginPath();
        ctx.ellipse(i * pitch + pitch / 2, pitch / 2, pitch * 0.42, pitch * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      p.current = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      if (!queued.current) { queued.current = true; requestAnimationFrame(draw); }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  useEffect(() => {
    if (!headings.length) return;
    const els = headings.map((h) => document.getElementById(h.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    let queuedS = false;
    const pick = () => {
      queuedS = false;
      const line = window.innerHeight * 0.3;
      let best = "";
      for (const el of els) if (el.getBoundingClientRect().top <= line) best = el.id;
      setActive(best || els[0].id);
    };
    const onScroll = () => { if (!queuedS) { queuedS = true; requestAnimationFrame(pick); } };
    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  return (
    <nav className="rail" aria-label="Sections">
      <canvas ref={dots} className="rail-dots" aria-hidden />
      <ol>
        {headings.map((h) => (
          <li key={h.id} data-on={h.id === active ? "" : undefined}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
