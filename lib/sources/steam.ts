import type { MediaItem } from "@/lib/types";

/**
 * Steam adapter (single-user). Public Web API — no OAuth, just an API key
 * and your 64-bit SteamID. Your profile + game details must be public.
 *
 * Curated mode: set STEAM_GAME_IDS to a comma-separated list of appids and
 * only those games show, in that order. Unset → falls back to recently-played.
 *
 * Env: STEAM_API_KEY, STEAM_ID, STEAM_GAME_IDS (optional)
 */

const API = "https://api.steampowered.com";

interface SteamGame {
  appid: number;
  name: string;
  playtime_2weeks?: number; // minutes
  playtime_forever: number; // minutes
}

function configured() {
  return Boolean(process.env.STEAM_API_KEY && process.env.STEAM_ID);
}

const cover = (appid: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;

function toItem(game: SteamGame, intakeAt: string, live = false): MediaItem {
  return {
    id: `steam:app:${game.appid}`,
    medium: "GME",
    source: "steam",
    title: game.name,
    subtitle: live ? "Playing now" : "", // no playtime — clean, art carries it
    image: cover(game.appid),
    aspect: "600 / 900", // Steam library capsule is a fixed 2:3
    url: null, // no link out to Steam
    intakeAt,
    liveNow: live,
  };
}

async function currentlyPlaying(key: string, id: string): Promise<string | null> {
  const res = await fetch(
    `${API}/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${id}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.response?.players?.[0]?.gameid ?? null;
}

/** Curated: only the games you pick, in your order. */
async function fetchCurated(key: string, id: string, picks: string[]): Promise<MediaItem[]> {
  const [ownedRes, liveAppid] = await Promise.all([
    fetch(
      `${API}/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${id}&include_appinfo=1&include_played_free_games=1`,
      { next: { revalidate: 300 } }
    ),
    currentlyPlaying(key, id),
  ]);

  const owned: SteamGame[] = ownedRes.ok ? (await ownedRes.json()).response?.games ?? [] : [];
  const byId = new Map(owned.map((g) => [String(g.appid), g]));
  const base = Date.now();

  return picks.map((appid, i) => {
    const g = byId.get(appid) ?? { appid: Number(appid), name: `App ${appid}`, playtime_forever: 0 };
    return toItem(g, new Date(base - i * 60_000).toISOString(), liveAppid === appid);
  });
}

/** Fallback: whatever you've played in the last two weeks. */
async function fetchRecent(key: string, id: string): Promise<MediaItem[]> {
  const [recentRes, liveAppid] = await Promise.all([
    fetch(
      `${API}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${key}&steamid=${id}&count=12`,
      { next: { revalidate: 120 } }
    ),
    currentlyPlaying(key, id),
  ]);

  const games: SteamGame[] = recentRes.ok ? (await recentRes.json()).response?.games ?? [] : [];
  const base = Date.now();
  return games.map((g, i) =>
    toItem(g, new Date(base - i * 60_000).toISOString(), liveAppid === String(g.appid))
  );
}

/** What game Kjel is in *right now*, if any. */
export async function fetchSteamNow(): Promise<{ title: string } | null> {
  if (!configured()) return null;
  try {
    const res = await fetch(
      `${API}/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${process.env.STEAM_ID}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const p = (await res.json()).response?.players?.[0];
    return p?.gameextrainfo ? { title: p.gameextrainfo } : null;
  } catch {
    return null;
  }
}

export async function fetchSteam(): Promise<MediaItem[]> {
  if (!configured()) return [];
  const key = process.env.STEAM_API_KEY as string;
  const id = process.env.STEAM_ID as string;
  const picks = (process.env.STEAM_GAME_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  try {
    return picks.length ? fetchCurated(key, id, picks) : fetchRecent(key, id);
  } catch {
    return [];
  }
}
