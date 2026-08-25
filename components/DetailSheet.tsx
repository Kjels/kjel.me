"use client";

import { useEffect } from "react";
import type { MediaItem } from "@/lib/types";
import { MEDIA, SOURCE_LABEL, ago } from "@/lib/media";

export function DetailSheet({
  item,
  now,
  onClose,
}: {
  item: MediaItem | null;
  now: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [item, onClose]);

  if (!item) return null;
  const cfg = MEDIA[item.medium];
  const rows: [string, string][] = [
    ["Medium", cfg.label],
    ["Source", SOURCE_LABEL[item.source]],
    // manual items have no meaningful "added" date — skip the fake timestamp
    ...(item.source === "manual" ? [] : ([["Added", ago(item.intakeAt, now)]] as [string, string][])),
    ...Object.entries(item.meta ?? {}),
  ];

  return (
    <div
      className="scrim fixed inset-0 z-50 flex justify-center items-end md:items-stretch md:justify-end bg-fg/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div
        className="sheet w-full max-h-[88vh] border-t border-fg bg-raised overflow-y-auto md:max-w-[440px] md:h-full md:max-h-none md:border-t-0 md:border-l"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header bar */}
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-raised border-b border-line">
          <span className="mono text-[10px] tracking-[0.1em] uppercase text-fg2">
            {cfg.label}
          </span>
          <button
            onClick={onClose}
            className="mono text-[11px] tracking-[0.08em] uppercase border border-fg px-[10px] py-[10px] leading-none hover:bg-fg hover:text-surface transition-colors"
          >
            Close
          </button>
        </div>

        <div className="p-4">
          {/* hero at true native ratio — the payoff for the square crop */}
          <div
            className="relative w-full overflow-hidden bg-well mb-4"
            style={{ aspectRatio: cfg.ratio }}
          >
            {item.image ? (
              <img
                src={item.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <span className="font-display font-bold text-[26px] leading-[1.05] tracking-[-0.02em] text-fg text-balance">
                  {item.title}
                </span>
              </div>
            )}
          </div>

          <h2 className="font-display font-extrabold text-[26px] leading-[1.05] tracking-[-0.025em] text-balance">
            {item.title}
          </h2>
          <p className="text-[14px] text-fg2 mt-1">{item.subtitle}</p>

          {item.notes && (
            <div className="mt-4">
              <span className="mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "#e4b363" }}>
                ✦ Kjel —
              </span>
              <p className="font-display text-[15px] leading-[1.45] text-fg mt-1 text-balance">
                {item.notes}
              </p>
            </div>
          )}

          {/* spec table */}
          <dl className="mt-5 border-t border-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-[9px] border-b border-line">
                <dt className="mono text-[10px] tracking-[0.08em] uppercase text-fg3">{k}</dt>
                <dd className="mono text-[12px] text-fg text-right">{v}</dd>
              </div>
            ))}
          </dl>

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mono mt-5 flex items-center justify-center gap-2 text-[12px] tracking-[0.08em] uppercase border border-fg py-[12px] hover:bg-fg hover:text-surface transition-colors"
            >
              Open on {SOURCE_LABEL[item.source]} ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
