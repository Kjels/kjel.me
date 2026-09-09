"use client";

import { useState } from "react";
import Link from "next/link";
import type { BoardText } from "@/lib/board-text";

// Board copy editor. One row per board line; an empty row is a paragraph gap.
const AREAS: { key: keyof BoardText; label: string; rows?: number }[] = [
  { key: "home", label: "home" },
  { key: "homeNarrow", label: "home · phone", rows: 2 },
  { key: "roles", label: "roles, in order", rows: 7 },
];

export function ConfigEditor({ initial }: { initial: BoardText }) {
  const [v, setV] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const a of AREAS) m[a.key] = initial[a.key].join("\n");
    return m;
  });
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  async function save() {
    setState("busy");
    const body: BoardText = {
      home: v.home.split("\n"),
      homeNarrow: v.homeNarrow.split("\n"),
      roles: v.roles.split("\n").filter(Boolean),
    };
    const res = await fetch("/api/board", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setState(res.ok ? "saved" : "error");
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    location.reload();
  }

  return (
    <div className="mx-auto max-w-[760px] px-6 py-10 min-h-screen">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="mono text-[11px] uppercase tracking-[0.1em] text-fg2">board copy</h1>
        <div className="flex gap-4 mono text-[11px] uppercase tracking-[0.08em]">
          <Link href="/" className="text-fg3 hover:text-fg">view</Link>
          <button onClick={logout} className="text-fg3 hover:text-fg">log out</button>
        </div>
      </div>
      <div className="space-y-6">
        {AREAS.map((a) => (
          <label key={a.key} className="block">
            <span className="mono text-[10px] uppercase tracking-[0.1em] text-fg3 block mb-2">{a.label}</span>
            <textarea
              value={v[a.key]}
              onChange={(e) => setV((p) => ({ ...p, [a.key]: e.target.value }))}
              rows={a.rows ?? 3}
              spellCheck={false}
              className="w-full bg-well border border-line px-3 py-2 text-[14px] uppercase font-[inherit] focus:border-fg outline-none resize-y"
            />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={save}
          disabled={state === "busy"}
          className="mono text-[11px] uppercase tracking-[0.08em] border border-fg px-4 py-[7px] hover:bg-fg hover:text-surface transition-colors disabled:opacity-50"
        >
          {state === "busy" ? "saving…" : "save"}
        </button>
        <span className="mono text-[11px] uppercase tracking-[0.08em] text-fg3" aria-live="polite">
          {state === "saved" ? "saved. the board updates on the next load." : state === "error" ? "could not save. check the blob token." : ""}
        </span>
      </div>
    </div>
  );
}
