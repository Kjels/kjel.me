"use client";

import { useState } from "react";
import type { Comment, MediaItem, Medium } from "@/lib/types";
import type { Views } from "@/lib/views";
import { MEDIA } from "@/lib/media";

const MEDIA_OPTS: Medium[] = ["FLM", "BK", "MUS", "GME", "YT"];
const field = "w-full bg-well border border-line px-2 py-[6px] text-[13px] placeholder:text-fg3 focus:border-fg outline-none";

export function AdminPanel({
  initialMedia,
  initialComments,
  views,
}: {
  initialMedia: MediaItem[];
  initialComments: Comment[];
  views: Views;
}) {
  const [media, setMedia] = useState(initialMedia);
  const [comments, setComments] = useState(initialComments);
  const [tab, setTab] = useState<"media" | "comments">("media");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Blob is eventually consistent — drive UI from API responses, not re-reads.
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medium: fd.get("medium"),
        title: fd.get("title"),
        author: fd.get("author") || undefined,
        year: fd.get("year") || undefined,
        subtitle: fd.get("subtitle") || undefined,
        image: fd.get("image") || undefined,
        notes: fd.get("notes") || undefined,
        url: fd.get("url") || undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (data?.ok && data.item) {
      form.reset();
      setMedia((prev) => [data.item, ...prev]);
    } else {
      alert(data?.error || "Add failed");
    }
  }

  async function saveEdit(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/media/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        subtitle: fd.get("subtitle"),
        image: fd.get("image"),
        notes: fd.get("notes") || undefined,
        url: fd.get("url") || null,
        ...(fd.has("status") && {
          status: fd.get("status") || undefined,
          rating: fd.get("rating") ? Number(fd.get("rating")) : undefined,
          review: fd.get("review") || undefined,
          genre: fd.get("genre") || undefined,
        }),
      }),
    });
    const data = await res.json().catch(() => null);
    setEditing(null);
    if (data?.items) setMedia(data.items);
  }

  async function del(id: string) {
    if (!confirm("Delete this item?")) return;
    setMedia((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/media/${id}`, { method: "DELETE" });
  }

  async function pin(id: string, pinned: boolean) {
    const res = await fetch("/api/media/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pinned }),
    });
    const data = await res.json().catch(() => null);
    if (data?.items) setMedia(data.items);
  }

  async function setCurrentItem(id: string, current: boolean) {
    const res = await fetch("/api/media/current", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, current }),
    });
    const data = await res.json().catch(() => null);
    if (data?.items) setMedia(data.items);
  }

  async function move(id: string, dir: -1 | 1) {
    const i = media.findIndex((m) => m.id === id);
    const res = await fetch("/api/media/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, toIndex: i + dir }),
    });
    const data = await res.json().catch(() => null);
    if (data?.items) setMedia(data.items);
  }

  async function delComment(id: string) {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, hidden: true, body: "" } : c)));
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    location.reload();
  }

  const today = new Date().toISOString().slice(0, 10);
  const last7 = Object.entries(views.days)
    .filter(([d]) => (Date.now() - new Date(d).getTime()) / 86400000 < 7)
    .reduce((n, [, c]) => n + c, 0);

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-extrabold text-[26px] tracking-[-0.04em]">
          kjel<span className="text-fg3">.me</span> <span className="text-fg3 text-[16px]">/ admin</span>
        </h1>
        <div className="flex items-center gap-4">
          <a href="/" className="mono text-[10px] uppercase tracking-[0.08em] text-fg3 hover:text-fg">view site ↗</a>
          <button onClick={logout} className="mono text-[10px] uppercase tracking-[0.08em] text-fg3 hover:text-fg">log out</button>
        </div>
      </div>

      {/* visitors */}
      <div className="mono text-[11px] text-fg2 mb-6 flex flex-wrap gap-x-5 gap-y-1 border border-line px-3 py-2">
        <span className="uppercase tracking-[0.08em] text-fg3">visitors</span>
        <span><span className="text-fg font-semibold">{views.total.toLocaleString()}</span> all-time</span>
        <span><span className="text-fg">{(views.days[today] ?? 0).toLocaleString()}</span> today</span>
        <span><span className="text-fg">{last7.toLocaleString()}</span> last 7 days</span>
      </div>

      <div className="flex gap-5 border-b border-line mb-5">
        {(["media", "comments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`mono text-[11px] uppercase tracking-[0.08em] pb-2 -mb-px border-b-2 ${tab === t ? "border-fg text-fg" : "border-transparent text-fg3"}`}
          >
            {t} {t === "media" ? `(${media.length})` : `(${comments.filter((c) => !c.hidden).length})`}
          </button>
        ))}
      </div>

      {tab === "media" && (
        <>
          {/* add */}
          <form onSubmit={add} className="border border-line p-3 mb-6 space-y-2">
            <p className="mono text-[10px] uppercase tracking-[0.1em] text-fg2">add media</p>
            <div className="flex gap-2">
              <select name="medium" className={`${field} w-24`} defaultValue="FLM">
                {MEDIA_OPTS.map((m) => <option key={m} value={m}>{MEDIA[m].label}</option>)}
              </select>
              <input name="title" placeholder="title*" required className={field} />
            </div>
            <div className="flex gap-2">
              <input name="author" placeholder="author / director (helps auto-find cover)" className={field} />
              <input name="year" placeholder="year" className={`${field} w-20`} />
            </div>
            <input name="image" placeholder="image url (optional — auto-resolved if blank)" className={field} />
            <input name="subtitle" placeholder="subtitle (optional)" className={field} />
            <input name="url" placeholder="link out (optional)" className={field} />
            <textarea name="notes" rows={2} placeholder="your note (B-side, optional)" className={`${field} resize-none`} />
            <button disabled={busy} className="mono text-[11px] uppercase tracking-[0.08em] border border-fg px-4 py-[7px] hover:bg-fg hover:text-surface transition-colors">
              {busy ? "adding…" : "add"}
            </button>
          </form>

          {/* list */}
          <div className="space-y-2">
            {media.map((m, i) => (
              <div key={m.id} className="border border-line p-2">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.image ? <img src={m.image} alt="" className="w-9 h-12 object-cover bg-well" /> : <div className="w-9 h-12 bg-well" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] truncate flex items-center gap-[6px]">
                      {m.pinned && <span style={{ color: "#e4b363" }} title="pinned to homepage">★</span>}
                      {m.current && <span style={{ color: "#e4b363" }} title="now (in the Now block)">✦</span>}
                      {m.title}
                    </div>
                    <div className="mono text-[10px] text-fg3 uppercase tracking-[0.06em]">{MEDIA[m.medium].label} · {m.subtitle || "—"}</div>
                  </div>
                  <div className="flex items-center gap-2 mono text-[10px] uppercase text-fg3">
                    {m.medium === "BK" && (
                      <button onClick={() => setCurrentItem(m.id, !m.current)} className="hover:text-fg" style={m.current ? { color: "#e4b363" } : undefined} title="now reading">{m.current ? "reading ✓" : "reading"}</button>
                    )}
                    <button onClick={() => pin(m.id, !m.pinned)} className="hover:text-fg" style={m.pinned ? { color: "#e4b363" } : undefined}>{m.pinned ? "unpin" : "pin"}</button>
                    <button onClick={() => move(m.id, -1)} disabled={i === 0} className="hover:text-fg disabled:opacity-30">↑</button>
                    <button onClick={() => move(m.id, 1)} disabled={i === media.length - 1} className="hover:text-fg disabled:opacity-30">↓</button>
                    <button onClick={() => setEditing(editing === m.id ? null : m.id)} className="hover:text-fg">edit</button>
                    <button onClick={() => del(m.id)} className="hover:text-fg">del</button>
                  </div>
                </div>
                {editing === m.id && (
                  <form onSubmit={(e) => saveEdit(m.id, e)} className="mt-2 space-y-2 border-t border-line pt-2">
                    <input name="title" defaultValue={m.title} placeholder="title" className={field} />
                    <input name="subtitle" defaultValue={m.subtitle} placeholder="subtitle" className={field} />
                    <input name="image" defaultValue={m.image ?? ""} placeholder="image url" className={field} />
                    <input name="url" defaultValue={m.url ?? ""} placeholder="link out" className={field} />
                    <textarea name="notes" defaultValue={m.notes ?? ""} rows={2} placeholder="note" className={`${field} resize-none`} />
                    {m.medium === "BK" && (
                      <>
                        <div className="flex gap-2">
                          <select name="status" defaultValue={m.status ?? "read"} className={`${field} w-32`}>
                            <option value="read">read</option>
                            <option value="reading">reading</option>
                            <option value="tbr">to-be-read</option>
                          </select>
                          <select name="rating" defaultValue={m.rating ?? ""} className={`${field} w-32`}>
                            <option value="">no rating</option>
                            {[5, 4, 3, 2, 1].map((r) => (
                              <option key={r} value={r}>{"●".repeat(r)}</option>
                            ))}
                          </select>
                          <input name="genre" defaultValue={m.genre ?? ""} placeholder="genre (grows a shelf)" className={field} />
                        </div>
                        <textarea name="review" defaultValue={m.review ?? ""} rows={4} placeholder="review (shown on the book's page)" className={`${field} resize-y`} />
                      </>
                    )}
                    <button className="mono text-[11px] uppercase tracking-[0.08em] border border-fg px-4 py-[6px] hover:bg-fg hover:text-surface transition-colors">save</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "comments" && (
        <div className="space-y-3">
          {comments.length === 0 && <p className="mono text-[11px] text-fg3 uppercase">no comments yet</p>}
          {comments.map((c) => (
            <div key={c.id} className="border border-line p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mono text-[10px] uppercase tracking-[0.06em]">
                  <span style={{ color: c.isAdmin ? "#e4b363" : undefined }} className={c.isAdmin ? "font-semibold" : "text-fg2"}>
                    {c.isAdmin ? "Kjel" : c.name || "Anonymous"}
                  </span>
                  {c.parentId && <span className="text-fg3"> · reply</span>}
                  {c.hidden && <span className="text-fg3"> · removed</span>}
                </div>
                <p className="text-[13px] mt-1 break-words">{c.hidden ? "[removed]" : c.body}</p>
              </div>
              {!c.hidden && (
                <button onClick={() => delComment(c.id)} className="mono text-[10px] uppercase text-fg3 hover:text-fg shrink-0">delete</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
