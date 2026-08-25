"use client";

import { useState } from "react";
import type { BoardText } from "@/lib/board-text";

// Board copy editor. Multiline fields map one row to one board line;
// an empty row is a blank line (paragraph gap) on the board.

const AREAS: { key: string; label: string; get: (t: BoardText) => string[]; rows?: number }[] = [
  { key: "home", label: "home", get: (t) => t.home },
  { key: "homeNarrow", label: "home · phone", get: (t) => t.homeNarrow, rows: 2 },
  { key: "WORK", label: "work", get: (t) => t.pages.WORK },
  { key: "NOW", label: "now", get: (t) => t.pages.NOW },
  { key: "NOTES", label: "notes", get: (t) => t.pages.NOTES, rows: 2 },
  { key: "about", label: "about", get: (t) => t.about },
  { key: "aboutNarrow", label: "about · phone", get: (t) => t.aboutNarrow },
  { key: "roles", label: "roles", get: (t) => t.roles },
];

const FIELDS: { key: string; label: string; get: (t: BoardText) => string }[] = [
  { key: "place", label: "place", get: (t) => t.place },
  { key: "placeNarrow", label: "place · phone", get: (t) => t.placeNarrow },
  { key: "linkedin", label: "linkedin url", get: (t) => t.linkedin },
  { key: "email", label: "email", get: (t) => t.email },
];

export function ConfigEditor({ initial }: { initial: BoardText }) {
  const [v, setV] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const a of AREAS) m[a.key] = a.get(initial).join("\n");
    for (const f of FIELDS) m[f.key] = f.get(initial).replace(/^mailto:/, "");
    return m;
  });
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  async function save() {
    setState("busy");
    const email = v.email.includes("@") && !v.email.startsWith("mailto:") ? `mailto:${v.email}` : v.email;
    const body: BoardText = {
      home: v.home.split("\n"),
      homeNarrow: v.homeNarrow.split("\n"),
      pages: { WORK: v.WORK.split("\n"), NOW: v.NOW.split("\n"), NOTES: v.NOTES.split("\n") },
      about: v.about.split("\n"),
      aboutNarrow: v.aboutNarrow.split("\n"),
      place: v.place,
      placeNarrow: v.placeNarrow,
      roles: v.roles.split("\n").filter(Boolean),
      linkedin: v.linkedin,
      email,
    };
    const res = await fetch("/api/board", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setState(res.ok ? "saved" : "error");
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setV((p) => ({ ...p, [k]: e.target.value }));
    setState("idle");
  };

  return (
    <div className="min-h-screen px-4 py-10 flex justify-center">
      <div className="w-full max-w-[560px]">
        <h1 className="font-display font-extrabold text-[28px] tracking-[-0.04em] mb-1">
          kjel<span className="text-fg3">.me</span>
        </h1>
        <p className="mono text-[10px] uppercase tracking-[0.1em] text-fg3 mb-8">
          board text · one line per row · blank row = gap · a-z 0-9 . , &apos; - &amp; ! ? / :
        </p>

        <div className="flex flex-col gap-6">
          {AREAS.map((a) => (
            <label key={a.key} className="block">
              <span className="mono block text-[10px] uppercase tracking-[0.1em] text-fg3 mb-2">{a.label}</span>
              <textarea
                value={v[a.key]}
                onChange={set(a.key)}
                rows={Math.max(a.rows ?? 3, v[a.key].split("\n").length)}
                spellCheck={false}
                className="w-full bg-well border border-line focus:border-fg px-3 py-2 text-[13px] leading-[1.6] outline-none resize-y font-[inherit] uppercase"
              />
            </label>
          ))}
          <div className="grid grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <label key={f.key} className={f.key === "linkedin" || f.key === "email" ? "col-span-2 block" : "block"}>
                <span className="mono block text-[10px] uppercase tracking-[0.1em] text-fg3 mb-2">{f.label}</span>
                <input
                  value={v[f.key]}
                  onChange={set(f.key)}
                  spellCheck={false}
                  className={`w-full bg-well border border-line focus:border-fg px-3 py-2 text-[13px] outline-none ${
                    f.key === "linkedin" || f.key === "email" ? "" : "uppercase"
                  }`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-baseline gap-4 mt-8">
          <button
            onClick={save}
            disabled={state === "busy"}
            className="mono text-[12px] uppercase tracking-[0.08em] border border-fg px-6 py-[10px] hover:bg-fg hover:text-surface transition-colors disabled:opacity-50"
          >
            save
          </button>
          {state === "saved" && <span className="mono text-[10px] uppercase tracking-[0.1em] text-fg3">saved — live in a few seconds</span>}
          {state === "error" && <span className="mono text-[10px] uppercase tracking-[0.1em] text-fg3">save failed — log in again?</span>}
        </div>
      </div>
    </div>
  );
}
