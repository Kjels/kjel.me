"use client";

import { useState } from "react";
import { DotText } from "@/components/DotText";

// Put the mark at the end of a sentence. An open note is a block in the paragraph's flow, so a
// mark dropped mid-clause severs the sentence around it.
//
// A note. Not a margin note — the board has no margins, it has rows, and its way of showing you a
// second line of the same row is to turn the line over (updateFlip, the split-flap posting the next
// destination). So a note opens in the measure, wiped in left to right the way the board turns a
// page, on the same dotted rule the ledger uses. The numeral is the sign's own micro face at the
// board's live pitch — no pitch override, or it is a dot-shaped costume rather than the same sign.
export function Side({ n, children }: { n: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = `note-${n}`;
  return (
    <>
      <button
        type="button"
        className="note-mark"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <DotText text={String(n)} scale={0.62} />
      </button>
      <span className="note" id={id} data-open={open ? "" : undefined}>
        <span className="note-n" aria-hidden>
          <DotText text={String(n)} scale={0.8} />
        </span>
        <span className="note-body">{children}</span>
      </span>
    </>
  );
}
