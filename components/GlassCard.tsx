"use client";

import { useEffect, useRef } from "react";
import { CARDS } from "@/content/cards";
import { DotText } from "./DotText";

// A pane of frosted glass laid on the sign: the board's face for the title and the close,
// plain type for the sentences, dots for the diagrams. It sweeps in left to right like a page
// wipe. Esc, Close or a click outside closes it. Web glassmorphism, not a platform material.
const GREEN = "rgb(96,255,140)";
const GREY = "#9a999f";

export function GlassCard({ id, onClose }: { id: string | null; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
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
        <button type="button" className="glass-close" onClick={onClose}><DotText text="CLOSE" micro color={GREY} scale={0.55} /></button>
        <h2 id="glass-title" className="glass-title"><DotText text={card.title} color={GREEN} fit className="glass-dots" /></h2>
        <div className="glass-body">{card.intro}</div>
        {card.rules && (
          <ul className="glass-rules">
            {card.rules.map((r, i) => (
              <li key={i}>
                <span className="cells" aria-hidden>
                  {r.before.map((v, k) => <span key={k} className={"dot" + (v ? " on" : "") + (k === 4 ? " me" : "")} />)}
                </span>
                <span className="rule">{r.text}</span>
                <span className="out"><span className={"dot" + (r.after ? " on" : "")} aria-hidden />{r.outcome}</span>
              </li>
            ))}
          </ul>
        )}
        {card.after && <div className="glass-body">{card.after}</div>}
      </section>
    </>
  );
}
