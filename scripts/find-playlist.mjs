// Find a playlist by name and print its ID. Run: node scripts/find-playlist.mjs
import { readFileSync } from "node:fs";

const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of txt.split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2];
}

const basic = Buffer.from(
  `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
).toString("base64");

const tok = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
  }),
}).then((r) => r.json());

if (!tok.access_token) {
  console.error("✗ token refresh failed:", tok);
  process.exit(1);
}

const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
  headers: { Authorization: `Bearer ${tok.access_token}` },
}).then((r) => r.json());

if (!res.items) {
  console.error("✗ could not list playlists:", res);
  process.exit(1);
}

const items = res.items.filter(Boolean);
console.log(`\nVisible playlists (${items.length}):\n`);
for (const p of items) {
  const total = (p.tracks?.total ?? 0).toString().padStart(3);
  const mark = (p.name ?? "").toLowerCase() === "kjel.me" ? "  ← THIS ONE" : "";
  console.log(`${p.public ? "public " : "private"}  ${total}  ${p.id}  ${p.name}${mark}`);
}
