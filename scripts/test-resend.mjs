// Prove Resend works before trusting the site to it: sends one sample visit
// email using .env.local. Run: node scripts/test-resend.mjs
import { readFileSync } from "node:fs";

const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of txt.split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2];
}

const key = process.env.RESEND_API_KEY;
const to = process.env.NOTIFY_TO;
if (!key || !to) {
  console.error("Missing RESEND_API_KEY or NOTIFY_TO in .env.local");
  process.exit(1);
}

const from = process.env.NOTIFY_FROM ?? "kjel.me <onboarding@resend.dev>";
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from,
    to: [to],
    subject: "kjel.me visit — /media",
    text: "London, GB · iPhone Safari\nref: linkedin.com\ntest send · visit 1 today",
  }),
});

console.log(res.status, await res.text());
console.log(`from: ${from}\nto:   ${to}`);
