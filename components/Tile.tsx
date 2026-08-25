"use client";

import { memo, useState } from "react";
import type { MediaItem } from "@/lib/types";
import { MEDIA } from "@/lib/media";

export const Tile = memo(function Tile({
  item,
  sat,
  flipped,
  onOpen,
}: {
  item: MediaItem;
  /** saturation 0–1, signature "recency" cue set by the wall */
  sat: number;
  /** flip state driven by the parent's wave clock */
  flipped: boolean;
  onOpen: (item: MediaItem) => void;
}) {
  const cfg = MEDIA[item.medium];
  const [broken, setBroken] = useState(false);
  const showImage = item.image && !broken;

  return (
    <button
      onClick={() => onOpen(item)}
      data-flipped={flipped}
      aria-label={`${item.title} — ${item.subtitle}, ${cfg.label}`}
      className="tile"
    >
      <div className="flip" style={{ "--sat": sat } as React.CSSProperties}>
        {/* A-side — the artwork (natural ratio; fallback uses the medium ratio) */}
        <div
          className="face face-front bg-well"
          style={{ aspectRatio: showImage && item.aspect ? item.aspect : cfg.ratio }}
        >
          {showImage ? (
            <img
              src={item.image as string}
              alt=""
              loading="lazy"
              onError={() => setBroken(true)}
              className="art"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col justify-end p-3">
              <span className="font-display font-bold text-[clamp(15px,4.2vw,22px)] leading-[1.05] tracking-[-0.02em] text-fg text-balance line-clamp-5">
                {item.title}
              </span>
            </div>
          )}
          {item.medium === "YT" && (
            <span
              className="absolute inset-0 flex items-center justify-center text-white/85 text-[clamp(24px,7vw,34px)] pointer-events-none"
              style={{ textShadow: "0 1px 10px rgba(0,0,0,0.55)" }}
              aria-hidden
            >
              ▶
            </span>
          )}
          {/* breathing dot when this is live right now */}
          {item.liveNow && (
            <span className="absolute top-2 left-2 flex items-center gap-[5px]" aria-hidden>
              <span className="breathe w-[6px] h-[6px] rounded-full bg-fg" style={{ boxShadow: "0 0 6px rgba(0,0,0,0.6)" }} />
              <span className="mono text-[8px] uppercase tracking-[0.12em] text-fg" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>now</span>
            </span>
          )}
          {/* dog-ear: there's a note on this one */}
          {item.notes && (
            <span
              className="absolute top-0 right-0 w-0 h-0"
              style={{ borderTop: "12px solid rgba(242,242,240,0.4)", borderLeft: "12px solid transparent" }}
              aria-hidden
            />
          )}
        </div>

        {/* B-side — the note (or a simple title card), with an open affordance */}
        <div className="face face-back flex flex-col justify-between p-3 text-left">
          <div className="mono flex items-start justify-between text-[9px] tracking-[0.1em] uppercase text-fg3">
            <span>{cfg.label}</span>
            <span aria-hidden className="text-fg2">↗</span>
          </div>
          {item.notes ? (
            <p className="font-display text-[clamp(12px,3.4vw,15px)] leading-[1.35] text-fg text-balance line-clamp-6">
              {item.notes}
            </p>
          ) : (
            <p className="font-display font-bold text-[clamp(15px,4.2vw,20px)] leading-[1.1] tracking-[-0.02em] text-fg text-balance line-clamp-4">
              {item.title}
            </p>
          )}
          <div className="mono text-[9px] tracking-[0.06em] text-fg3 truncate">{item.subtitle}</div>
        </div>
      </div>
    </button>
  );
});
