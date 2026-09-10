"use client";

import { useEffect, useRef } from "react";
import { CARDS } from "@/content/cards";

// A glass card over the board: the HTML answer to a question the dots can only ask.
// A pane of frosted glass laid on the sign, sharp-cornered like the grid: a title, an explanation, a rule table.
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
      <section ref={ref} className="glass" data-glass role="dialog" aria-labelledby="glass-title" tabIndex={-1}>
        <button type="button" className="glass-close" onClick={onClose}>Close</button>
        <h2 id="glass-title" className="glass-title">{card.title}</h2>
        <div className="glass-body">{card.intro}</div>
        {card.rules && (
          <table className="glass-rules">
            <tbody>
              {card.rules.map(([state, cond, out], i) => (
                <tr key={i}>
                  <th scope="row">{state}</th>
                  <td>{cond}</td>
                  <td className="glass-out">{out}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {card.after && <div className="glass-body">{card.after}</div>}
      </section>
    </>
  );
}
