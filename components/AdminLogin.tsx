"use client";

import { useState } from "react";

export function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(false);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) location.reload();
    else {
      setErr(true);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-[300px]">
        <h1 className="font-display font-extrabold text-[28px] tracking-[-0.04em] mb-1">
          kjel<span className="text-fg3">.me</span>
        </h1>
        <p className="mono text-[10px] uppercase tracking-[0.1em] text-fg3 mb-5">admin</p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="password"
          autoFocus
          className={`w-full bg-well border px-3 py-2 text-[14px] outline-none ${err ? "border-fg" : "border-line focus:border-fg"}`}
        />
        {err && <p className="mono text-[10px] text-fg3 mt-2">nope.</p>}
        <button
          disabled={busy}
          className="mono w-full mt-3 text-[12px] uppercase tracking-[0.08em] border border-fg py-[10px] hover:bg-fg hover:text-surface transition-colors"
        >
          enter
        </button>
      </form>
    </div>
  );
}
