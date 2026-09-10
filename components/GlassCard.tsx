"use client";

import { useEffect, useRef } from "react";
import { CARDS } from "@/content/cards";

// A glass card over the board: the HTML answer to a question the dots can only ask.
// Frosted, fixed, one column of real type. Esc, the Close button or a click outside closes it.
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
      <section ref={ref} className="glass" data-glass role="dialog" aria-labelledby="glass-title" tabIndex={-1}>
        <div className="glass-head">
          <span className="lbl">{card.label}</span>
          <button type="button" className="glass-close lbl" onClick={onClose}>Close</button>
        </div>
        <h2 id="glass-title" className="glass-title">{card.title}</h2>
        <div className="glass-body">{card.body}</div>
        {card.foot && <p className="glass-foot mono">{card.foot}</p>}
      </section>
    </>
  );
}
