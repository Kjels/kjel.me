// Quick sanity check: pull real top tracks and print them. Run: node scripts/test-spotify.mjs
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

const data = await fetch(
  "https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=24",
  { headers: { Authorization: `Bearer ${tok.access_token}` } }
).then((r) => r.json());

if (!data.items) {
  console.error("✗ top tracks failed:", data);
  process.exit(1);
}

console.log(`\n✓ ${data.items.length} top tracks (medium_term):\n`);
data.items.forEach((t, i) => {
  const hasArt = t.album?.images?.[0]?.url ? "🖼" : "—";
  console.log(
    `${String(i + 1).padStart(2)}. ${t.name} — ${t.artists.map((a) => a.name).join(", ")}  [${t.album.name}] ${hasArt}`
  );
});
