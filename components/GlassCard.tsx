"use client";

import { useEffect, useRef } from "react";
import { CARDS } from "@/content/cards";

// A glass card over the board: the HTML answer to a question the dots can only ask.
// A pane of frosted glass laid on the sign, sharp-cornered like the grid: one lead sentence, a paragraph or two.
// Esc, Close or a click outside closes it. Web glassmorphism, not a platform material.
export function GlassCard({ id, onClose }: { id: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const card = id ? CARDS[id] : null;

  useEffect(() => {
    if (!card) return;
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [card, onClose]);

  if (!card) return null;
  return (
    <>
      <div className="glass-back" data-glass onPointerDown={onClose} aria-hidden />
      <section ref={ref} className="glass" data-glass role="dialog" aria-labelledby="glass-lead" tabIndex={-1}>
        <button type="button" className="glass-close" onClick={onClose}>Close</button>
        <p id="glass-lead" className="glass-lead">{card.lead}</p>
        <div className="glass-body">{card.body}</div>
      </section>
    </>
  );
}
