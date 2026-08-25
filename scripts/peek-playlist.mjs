// Print the actual tracks in a playlist. Run: node scripts/peek-playlist.mjs <playlistId>
import { readFileSync } from "node:fs";

const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of txt.split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2];
}

const id = process.argv[2] || process.env.SPOTIFY_PLAYLIST_ID;
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

const meta = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
  headers: { Authorization: `Bearer ${tok.access_token}` },
}).then((r) => r.json());

if (meta.error) {
  console.error("✗", meta.error);
  process.exit(1);
}

console.log(`\n"${meta.name}" — owner: ${meta.owner?.display_name} (${meta.owner?.id})`);
console.log(`total: ${meta.tracks?.total}\n`);

const tracks = await fetch(
  `https://api.spotify.com/v1/playlists/${id}/tracks?limit=50`,
  { headers: { Authorization: `Bearer ${tok.access_token}` } }
).then((r) => r.json());

(tracks.items ?? []).forEach((row, i) => {
  const t = row.track;
  if (!t) return console.log(`${i + 1}. (unavailable / local file)`);
  console.log(`${i + 1}. ${t.name} — ${t.artists.map((a) => a.name).join(", ")}`);
});
