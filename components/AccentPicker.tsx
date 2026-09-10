"use client";

import { useState } from "react";
import { ACCENTS, DEFAULT_ACCENT, accentHex, setAccent } from "./board/palette";
import { DotText } from "./DotText";
import { useAccent } from "./useAccent";

// A sandbox for the board's one colour: press A. Each swatch quotes a real display;
// the field takes any hex. The choice sticks in this browser until reset.
export function AccentPicker({ onClose }: { onClose: () => void }) {
  const accent = useAccent();
  const [hex, setHex] = useState(accentHex());
  const pick = (h: string) => { if (setAccent(h)) setHex(h.replace(/^#/, "").toLowerCase()); };
  return (
    <section className="glass accent" data-glass role="dialog" aria-labelledby="accent-title" tabIndex={-1}>
      <button type="button" className="glass-close" onClick={onClose}><DotText text="CLOSE" micro color="#9a999f" scale={0.55} /></button>
      <h2 id="accent-title" className="glass-title"><DotText text="ACCENT" color={accent} className="glass-dots" /></h2>
      <ul className="swatches">
        {ACCENTS.map((a) => (
          <li key={a.hex}>
            <button type="button" className={"swatch" + (a.hex === hex ? " is-on" : "")} onClick={() => pick(a.hex)} style={{ ["--sw" as string]: `#${a.hex}` }}>
              <span className="swatch-dot" aria-hidden />
              <span className="swatch-name">{a.name}</span>
              <span className="swatch-note">{a.note}</span>
            </button>
          </li>
        ))}
      </ul>
      <form className="accent-hex" onSubmit={(e) => { e.preventDefault(); pick(hex); }}>
        <label htmlFor="accent-input">Hex</label>
        <input id="accent-input" value={hex} onChange={(e) => setHex(e.target.value.replace(/^#/, ""))} maxLength={6} spellCheck={false} autoComplete="off" />
        <button type="submit">Apply</button>
        <button type="button" onClick={() => pick(DEFAULT_ACCENT)}>Reset</button>
      </form>
    </section>
  );
}
