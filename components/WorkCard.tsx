"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Picto } from "./Picto";
import { TickRule } from "./TickRule";

export type CardData = {
  slug: string; title: string; blurb: string; verb: string; started: string;
  stack: string[]; repo?: string; site?: string;
  gen?: string | null; pushed?: string | null; roadmap?: { done: number; total: number } | null;
};

// A project card that flips like a dot: the mark on the front, the facts on
// the back. Hover or focus flips it; on touch a Details button does. The name
// is a real link; clicking the card body is a shortcut to the same place.
export function WorkCard({ d, index }: { d: CardData; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const router = useRouter();
  const href = `/work/${d.slug}`;
  return (
    <li className="card-slot" style={{ "--i": index } as React.CSSProperties}>
      <div
        className="card"
        data-flipped={flipped ? "" : undefined}
        onClick={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest("a, button")) return;
          router.push(href);
        }}
      >
        <div className="face front">
          <span className="card-top">
            <span className="num">{String(index + 1).padStart(2, "0")}</span>
            <span>{d.verb}</span>
          </span>
          <Picto slug={d.slug} className="card-mark" />
          <Link href={href} className="card-name">{d.title}</Link>
          <span className="card-blurb">{d.blurb}</span>
          <span className="card-foot">
            <span className="num">{d.started}</span>
            <button type="button" className="flip-btn" aria-pressed={flipped} onClick={() => setFlipped((f) => !f)}>
              Details
            </button>
          </span>
        </div>
        <div className="face back">
          <span className="card-top">
            <span className="num">{String(index + 1).padStart(2, "0")}</span>
            <span>{d.title}</span>
          </span>
          <span className="back-blurb">{d.blurb}</span>
          <dl className="back-facts">
            <div><dt>Since</dt><dd className="num">{d.started}</dd></div>
            {d.gen && <div><dt>Gen</dt><dd className="num">{d.gen}</dd></div>}
            {d.pushed && <div><dt>Pushed</dt><dd className="num">{d.pushed}</dd></div>}
            <div><dt>Stack</dt><dd>{d.stack.join(" · ")}</dd></div>
            {d.roadmap && d.roadmap.total > 0 && <div><dt>Roadmap</dt><dd><TickRule done={d.roadmap.done} total={d.roadmap.total} /></dd></div>}
          </dl>
          <span className="back-links">
            <Link href={href}>Read the entry</Link>
            {d.repo && <a href={`https://github.com/${d.repo}`} target="_blank" rel="noreferrer">GitHub</a>}
            {d.site && <a href={d.site} target="_blank" rel="noreferrer">{d.site.replace(/^https?:\/\//, "")}</a>}
          </span>
          <span className="card-foot">
            <span />
            <button type="button" className="flip-btn" aria-pressed={flipped} onClick={() => setFlipped((f) => !f)}>
              Back
            </button>
          </span>
        </div>
      </div>
    </li>
  );
}
