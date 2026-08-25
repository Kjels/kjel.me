"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaItem, Medium } from "@/lib/types";
import type { NowItem } from "@/lib/feed";
import { CHANNELS, NOW_VERB } from "@/lib/media";
import { Tile } from "./Tile";
import { DetailSheet } from "./DetailSheet";
import { Guestbook } from "./Guestbook";

const satFor = (i: number) => Math.min(1, Math.max(0.55, 1 - i * 0.012));

// stable scramble so the "All" view mixes media instead of striping by type
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ambient flip: every tick, flip one random tile for a moment — calm + random
const AMBIENT_TICK = 1700; // ms between ambient flips
const AMBIENT_HOLD = 4000; // ms a tile stays flipped

export function Feed({ items, now, live = [] }: { items: MediaItem[]; now: number; live?: NowItem[] }) {
  const [channel, setChannel] = useState<Medium | "ALL">("ALL");
  const [open, setOpen] = useState<MediaItem | null>(null);
  const [userFlipped, setUserFlipped] = useState<Set<string>>(new Set());
  const [autoFlipped, setAutoFlipped] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    if (channel === "ALL") {
      // games + books live only in their own channels (their art muddies the clean mix)
      const all = items.filter((i) => i.medium !== "GME" && i.medium !== "BK");
      const pinned = all.filter((i) => i.pinned); // admin-curated lead, in their order
      const rest = all.filter((i) => !i.pinned).sort((a, b) => hash(a.id) - hash(b.id));
      return [...pinned, ...rest]; // pinned lead, scatter behind
    }
    return items.filter((i) => i.medium === channel);
  }, [items, channel]);

  // ambient random flip — one tile at a time, auto-reverting, so it stays calm
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ids = visible.map((i) => i.id);
    if (!ids.length) return;
    const tick = setInterval(() => {
      const id = ids[Math.floor(Math.random() * ids.length)];
      setAutoFlipped((s) => new Set(s).add(id));
      setTimeout(() => {
        setAutoFlipped((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      }, AMBIENT_HOLD);
    }, AMBIENT_TICK);
    return () => clearInterval(tick);
  }, [visible]);

  // keep a live read of flip state without making the tap handler unstable
  const flipRef = useRef({ userFlipped, autoFlipped });
  flipRef.current = { userFlipped, autoFlipped };

  // tap: front → flip to the note; flipped → open the card
  const onTap = useCallback((item: MediaItem) => {
    const { userFlipped: u, autoFlipped: a } = flipRef.current;
    if (u.has(item.id) || a.has(item.id)) {
      setUserFlipped((s) => {
        const n = new Set(s);
        n.delete(item.id);
        return n;
      });
      setOpen(item);
    } else {
      setUserFlipped((s) => new Set(s).add(item.id));
    }
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] pb-24">
      {/* banner */}
      <header className="relative text-center pt-9 pb-5 border-b border-line mb-3 px-4">
        <Guestbook />
        <h1 className="font-display font-extrabold text-[clamp(34px,11vw,56px)] leading-[0.9] tracking-[-0.05em]">
          kjel<span className="text-fg3">.me</span>
        </h1>
        {/* Now block — manifesto by default; a line per live/current status */}
        {live.length ? (
          <div className="mono text-[11px] tracking-[0.04em] lowercase mt-3 space-y-[3px]">
            {live.map((l, i) => (
              <div key={`${l.medium}-${i}`} className="text-fg2 truncate max-w-[92%] mx-auto">
                <span style={{ color: "#e4b363" }} className={l.live ? "breathe" : ""}>✦</span> now{" "}
                {NOW_VERB[l.medium]} — <span className="text-fg">{l.title}</span>
                {l.subtitle ? <span className="text-fg3"> · {l.subtitle}</span> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mono text-[11px] tracking-[0.04em] lowercase mt-3 text-fg3">
            an earnest attempt at aggregating my consumption
          </p>
        )}
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4">
          {CHANNELS.map((c) => {
            const active = channel === c.medium;
            return (
              <button
                key={c.medium}
                onClick={() => setChannel(c.medium)}
                aria-pressed={active}
                className={`mono text-[12px] tracking-[0.06em] lowercase transition-colors ${
                  active ? "text-fg" : "text-fg3 hover:text-fg2"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* the wall */}
      {visible.length === 0 ? (
        <p className="mono text-[12px] text-fg3 py-20 text-center lowercase tracking-[0.06em]">
          nothing here yet.
        </p>
      ) : (
        <div className="wall">
          {visible.map((item, i) => (
            <Tile
              key={item.id}
              item={item}
              sat={satFor(i)}
              flipped={userFlipped.has(item.id) || autoFlipped.has(item.id)}
              onOpen={onTap}
            />
          ))}
        </div>
      )}

      <DetailSheet item={open} now={now} onClose={() => setOpen(null)} />
    </div>
  );
}
