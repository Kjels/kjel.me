// Match requested game names to owned appids, in order. Run: node scripts/resolve-steam.mjs
import { readFileSync } from "node:fs";

const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of txt.split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2];
}

const WANT = [
  "RimWorld", "Terraria", "ARC Raiders", "Enter the Gungeon", "Slay the Spire",
  "ELDEN RING", "Balatro", "Baldur's Gate 3", "DARK SOULS III",
  "The Elder Scrolls V: Skyrim", "Project Zomboid", "Divinity: Original Sin 2",
  "Mewgenics", "Kerbal Space Program", "Terraforming Mars", "Cyberpunk 2077",
  "Hades", "Hollow Knight", "MECCHA CHAMELEON", "Outer Wilds", "PEAK",
  "Poly Bridge", "ROUNDS", "Sid Meier's Civilization VI",
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const res = await fetch(
  `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${process.env.STEAM_ID}&include_appinfo=1&include_played_free_games=1`
).then((r) => r.json());
const games = res.response?.games ?? [];

const ids = [];
const misses = [];
for (const want of WANT) {
  const n = norm(want);
  // exact normalized match first, then startsWith/contains
  const hit =
    games.find((g) => norm(g.name) === n) ||
    games.find((g) => norm(g.name).startsWith(n)) ||
    games.find((g) => norm(g.name).includes(n));
  if (hit) {
    ids.push(hit.appid);
    console.log(`✓ ${want}  →  ${hit.appid}  (${hit.name})`);
  } else {
    misses.push(want);
    console.log(`✗ ${want}  →  NOT FOUND in library`);
  }
}

console.log(`\n${ids.length} matched, ${misses.length} missing.`);
console.log(`\nSTEAM_GAME_IDS=${ids.join(",")}`);
if (misses.length) console.log(`\nMissing: ${misses.join(", ")}`);
