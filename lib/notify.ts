/**
 * Instant "someone's on the site" email, sent through Resend's REST API — one
 * fetch, so this adds no dependency. Capped per day: past the cap the visits
 * still count, they just stop landing in the inbox. The email that hits the cap
 * says so, so silence after it is never ambiguous.
 */

export interface Visit {
  path: string;
  referrer: string | null;
  city: string | null;
  country: string | null;
  ua: string | null;
}

const BOT =
  /bot|crawl|spider|slurp|headless|lighthouse|monitor|preview|facebookexternalhit|embedly|curl|wget|python-requests|node-fetch/i;

export function isBot(ua: string | null): boolean {
  return !ua || BOT.test(ua);
}

function device(ua: string | null): string {
  if (!ua) return "unknown device";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "";
  return [os, browser].filter(Boolean).join(" ") || "unknown device";
}

function source(referrer: string | null): string {
  if (!referrer) return "direct";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer.slice(0, 80);
  }
}

function place(city: string | null, country: string | null): string {
  const parts = [city, country].filter(Boolean);
  return parts.length ? parts.join(", ") : "location unknown";
}

const when = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.NOTIFY_TZ ?? "Europe/London",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

// Per-instance daily tally. Asking Blob for the real number costs a list() per
// visit, which is half of what suspended the store — so the count in the email
// is this instance's, marked approximate rather than pretending to be global.
let tally = { day: "", n: 0 };

function nextCount(): number {
  const day = new Date().toISOString().slice(0, 10);
  if (tally.day !== day) tally = { day, n: 0 };
  return ++tally.n;
}

export async function notifyVisit(v: Visit): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_TO;
  if (!key || !to) return; // not configured — visits still count, just silently
  if (isBot(v.ua)) return;

  const n = nextCount();
  const cap = Number(process.env.NOTIFY_DAILY_CAP ?? 20);
  if (n > cap) return;
  const last = n === cap;

  const lines = [
    `${place(v.city, v.country)} · ${device(v.ua)}`,
    `ref: ${source(v.referrer)}`,
    `${when()} · visit ~${n} today`,
  ];
  if (last) lines.push(`(daily cap of ${cap} reached — no more emails until tomorrow)`);

  const body = {
    from: process.env.NOTIFY_FROM ?? "kjel.me <onboarding@resend.dev>",
    to: [to],
    subject: `kjel.me visit — ${v.path}`,
    text: lines.join("\n"),
    html:
      `<div style="font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e7e7e7;background:#0b0b0b;padding:24px">` +
      `<div style="font-size:18px;color:#fff;margin-bottom:12px">${v.path}</div>` +
      lines.map((l) => `<div style="color:#9a9a9a">${l}</div>`).join("") +
      `</div>`,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error("[notify] resend failed", res.status, await res.text());
}
