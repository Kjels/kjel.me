// R-03, the tick rule: a measure. One tick per roadmap item, filled when done.
export function TickRule({ done, total, label }: { done: number; total: number; label?: string }) {
  return (
    <span className="tick" role="img" aria-label={label ?? `${done} of ${total} done`}>
      <span className="tick-rule" aria-hidden>
        {Array.from({ length: total }, (_, i) => <i key={i} data-on={i < done ? "" : undefined} />)}
      </span>
      <span className="tick-num">{String(done).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
    </span>
  );
}
