// Progress as a row of dots, the site's own idiom. Lit dots are done items.
export function DotBar({ done, total, n = 24, label }: { done: number; total: number; n?: number; label?: string }) {
  const lit = total ? Math.round((done / total) * n) : 0;
  return (
    <div className="dotbar" role="img" aria-label={label ?? `${done} of ${total} roadmap items done`}>
      <span className="dotbar-dots" aria-hidden>
        {Array.from({ length: n }, (_, i) => <i key={i} data-on={i < lit ? "" : undefined} />)}
      </span>
      <span className="dotbar-num mono">{done}/{total}</span>
    </div>
  );
}
