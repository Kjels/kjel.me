// List your Steam library (most-played first) so you can pick which to feature.
// Run: node scripts/list-steam-games.mjs
import { readFileSync } from "node:fs";

const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of txt.split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2];
}

const key = process.env.STEAM_API_KEY;
const id = process.env.STEAM_ID;
if (!key || !id) {
  console.error("✗ Fill STEAM_API_KEY and STEAM_ID in .env.local first.");
  process.exit(1);
}

const res = await fetch(
  `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${id}&include_appinfo=1&include_played_free_games=1`
).then((r) => r.json());

const games = res.response?.games ?? [];
if (!games.length) {
  console.error("✗ No games returned. Is your profile + game details set to Public?");
  process.exit(1);
}

games.sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));
console.log(`\n${games.length} games (most-played first):\n`);
console.log("appid      hours   name");
for (const g of games.slice(0, 60)) {
  const hrs = Math.round((g.playtime_forever || 0) / 60).toString().padStart(5);
  console.log(`${String(g.appid).padEnd(8)} ${hrs}h   ${g.name}`);
}
