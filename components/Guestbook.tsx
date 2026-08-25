"use client";

import { useEffect, useState } from "react";
import type { Comment } from "@/lib/types";

const KJEL = "#e4b363"; // the one sanctioned color — Kjel's owner badge

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Byline({ c }: { c: Comment }) {
  return (
    <div className="mono flex items-baseline gap-2 text-[10px] tracking-[0.06em]">
      {c.isAdmin ? (
        <span style={{ color: KJEL }} className="font-semibold uppercase">
          Kjel
        </span>
      ) : (
        <span className="text-fg2 uppercase">{c.name || "Anonymous"}</span>
      )}
      <span className="text-fg3">{timeAgo(c.createdAt)}</span>
    </div>
  );
}

export function Guestbook() {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [admin, setAdmin] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetch("/api/comments").then((r) => r.json()).then(setComments).catch(() => {});

  useEffect(() => {
    if (!open) return;
    load();
    fetch("/api/admin/login").then((r) => r.json()).then((d) => setAdmin(!!d.admin)).catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function post(form: HTMLFormElement, parentId: string | null) {
    const fd = new FormData(form);
    const body = String(fd.get("body") || "").trim();
    if (!body || busy) return;
    setBusy(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        name: fd.get("name") || null,
        website: fd.get("website") || "", // honeypot
        parentId,
      }),
    });
    const data = await res.json().catch(() => null);
    form.reset();
    setReplyTo(null);
    setBusy(false);
    // optimistic — the Blob store is eventually consistent, so show it now
    if (data?.comment) setComments((prev) => [...prev, data.comment]);
  }

  async function remove(id: string) {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, hidden: true, body: "" } : c)));
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
  }

  const tops = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  const CommentRow = ({ c, reply }: { c: Comment; reply?: boolean }) => (
    <div className={reply ? "pl-4 border-l border-line ml-1" : ""}>
      <div className="flex items-start justify-between gap-2">
        <Byline c={c} />
        {admin && !c.hidden && (
          <button onClick={() => remove(c.id)} className="mono text-[9px] text-fg3 hover:text-fg uppercase">
            delete
          </button>
        )}
      </div>
      <p className={`text-[14px] leading-[1.45] mt-1 ${c.hidden ? "text-fg3 italic" : "text-fg"}`}>
        {c.hidden ? "[removed]" : c.body}
      </p>
      {!reply && (
        <button
          onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
          className="mono text-[10px] text-fg3 hover:text-fg uppercase tracking-[0.06em] mt-1"
        >
          reply
        </button>
      )}
      {replyTo === c.id && (
        <form onSubmit={(e) => { e.preventDefault(); post(e.currentTarget, c.id); }} className="mt-2 space-y-2">
          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          {!admin && (
            <input name="name" placeholder="name (optional)" className="w-full bg-well border border-line px-2 py-[6px] text-[13px] placeholder:text-fg3 focus:border-fg outline-none" />
          )}
          <textarea name="body" rows={2} required placeholder="reply…" className="w-full bg-well border border-line px-2 py-[6px] text-[13px] placeholder:text-fg3 focus:border-fg outline-none resize-none" />
          <button disabled={busy} className="mono text-[11px] uppercase tracking-[0.08em] border border-fg px-3 py-[6px] hover:bg-fg hover:text-surface transition-colors">
            {admin ? "reply as Kjel" : "post reply"}
          </button>
        </form>
      )}
    </div>
  );

  return (
    <>
      {/* the flag */}
      <button
        onClick={() => setOpen(true)}
        className="mono absolute top-3 right-3 sm:right-4 flex items-center gap-[6px] text-[10px] tracking-[0.06em] uppercase text-fg2 hover:text-fg border border-line hover:border-fg px-[9px] py-[6px] transition-colors"
      >
        <span style={{ color: KJEL }} className="text-[12px] leading-none">✦</span>
        Leave me a message
      </button>

      {open && (
        <div
          className="scrim fixed inset-0 z-50 flex justify-center items-end md:items-stretch md:justify-end bg-fg/40"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Guestbook"
        >
          <div
            className="sheet w-full max-h-[88vh] border-t border-fg bg-raised overflow-y-auto md:max-w-[460px] md:h-full md:max-h-none md:border-t-0 md:border-l"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-raised border-b border-line">
              <span className="mono text-[10px] tracking-[0.1em] uppercase text-fg2">Guestbook</span>
              <button onClick={() => setOpen(false)} className="mono text-[11px] tracking-[0.08em] uppercase border border-fg px-[10px] py-[6px] hover:bg-fg hover:text-surface transition-colors">
                Close
              </button>
            </div>

            <div className="p-4">
              <p className="text-[13px] text-fg2 mb-4">
                Say hi, leave a note, recommend something. Anonymous is fine.
              </p>

              {/* new top-level message */}
              <form onSubmit={(e) => { e.preventDefault(); post(e.currentTarget, null); }} className="space-y-2 mb-6">
                <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                {!admin && (
                  <input name="name" placeholder="name (optional)" className="w-full bg-well border border-line px-3 py-2 text-[14px] placeholder:text-fg3 focus:border-fg outline-none" />
                )}
                <textarea name="body" rows={3} required placeholder="your message…" className="w-full bg-well border border-line px-3 py-2 text-[14px] placeholder:text-fg3 focus:border-fg outline-none resize-none" />
                <button disabled={busy} className="mono w-full text-[12px] uppercase tracking-[0.08em] border border-fg py-[10px] hover:bg-fg hover:text-surface transition-colors">
                  {admin ? "post as Kjel" : "leave message"}
                </button>
              </form>

              {/* thread */}
              <div className="space-y-5">
                {tops.length === 0 && (
                  <p className="mono text-[11px] text-fg3 uppercase tracking-[0.06em]">be the first to write</p>
                )}
                {tops.map((c) => (
                  <div key={c.id} className="space-y-3">
                    <CommentRow c={c} />
                    {repliesOf(c.id).map((r) => (
                      <CommentRow key={r.id} c={r} reply />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
