import type { MediaItem } from "@/lib/types";

/**
 * Spotify adapter (single-user). Uses a long-lived refresh token to mint
 * access tokens server-side, then pulls what you've been listening to.
 *
 * Env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
 * Returns [] when unconfigured so the site still builds/runs.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  external_urls: { spotify: string };
}

function configured() {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REFRESH_TOKEN
  );
}

async function accessToken(): Promise<string | null> {
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN as string,
    }),
    next: { revalidate: 1800 }, // tokens last ~1h; refresh well within
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token ?? null;
}

function toItem(track: SpotifyTrack, playedAt: string, live = false): MediaItem {
  return {
    id: `spotify:track:${track.id}`,
    medium: "MUS",
    source: "spotify",
    title: track.name,
    subtitle: track.artists.map((a) => a.name).join(", "),
    image: track.album.images[0]?.url ?? null,
    aspect: "1 / 1", // Spotify album art is square
    url: track.external_urls.spotify,
    intakeAt: playedAt,
    liveNow: live,
    meta: { Album: track.album.name },
  };
}

// short_term ≈ 4 weeks · medium_term ≈ 6 months · long_term ≈ years
const TIME_RANGE = "medium_term";

/**
 * Curated: mirror a playlist, newest-added first.
 * Note: as of the Feb 2026 API migration the endpoint is /items (not /tracks)
 * and each row's track lives under `item` (not `track`).
 */
interface PlaylistRow {
  added_at: string;
  item: (SpotifyTrack & { type?: string }) | null;
}
async function fetchPlaylist(token: string, playlistId: string): Promise<MediaItem[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const rows: PlaylistRow[] = [];
  // Spotify returns max 50 items per page — page through the whole playlist.
  for (let offset = 0; offset < 1000; offset += 50) {
    const res = await fetch(
      `${API}/playlists/${playlistId}/items?market=from_token&limit=50&offset=${offset}`,
      { headers, next: { revalidate: 300 } }
    );
    if (!res.ok) break;
    const data = await res.json();
    const page: PlaylistRow[] = data.items ?? [];
    rows.push(...page);
    if (page.length < 50 || rows.length >= (data.total ?? rows.length)) break;
  }
  // keep Spotify's playlist order (top-to-bottom) — no re-sort
  return rows
    .filter((row) => row.item?.id && row.item.type !== "episode")
    .map((row) => toItem(row.item as SpotifyTrack, row.added_at || new Date().toISOString()));
}

/** Algorithmic fallback: your top tracks. */
async function fetchTopTracks(token: string): Promise<MediaItem[]> {
  const res = await fetch(`${API}/me/top/tracks?time_range=${TIME_RANGE}&limit=24`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const tracks: SpotifyTrack[] = data.items ?? [];
  const base = Date.now();
  return tracks.map((t, i) => toItem(t, new Date(base - i * 60_000).toISOString()));
}

/** What Kjel is listening to *right now* (needs user-read-currently-playing scope). */
export async function fetchSpotifyNow(): Promise<{ title: string; subtitle: string; url: string | null } | null> {
  if (!configured()) return null;
  try {
    const token = await accessToken();
    if (!token) return null;
    const res = await fetch(`${API}/me/player/currently-playing`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 30 },
    });
    if (res.status === 204 || !res.ok) return null; // 204 = nothing playing
    const data = await res.json();
    if (!data?.is_playing || !data.item) return null;
    return {
      title: data.item.name,
      subtitle: (data.item.artists ?? []).map((a: { name: string }) => a.name).join(", "),
      url: data.item.external_urls?.spotify ?? null,
    };
  } catch {
    return null;
  }
}

export async function fetchSpotify(): Promise<MediaItem[]> {
  if (!configured()) return [];
  try {
    const token = await accessToken();
    if (!token) return [];
    // a curated playlist wins; otherwise fall back to top tracks
    const playlistId = process.env.SPOTIFY_PLAYLIST_ID;
    return playlistId ? fetchPlaylist(token, playlistId) : fetchTopTracks(token);
  } catch {
    return [];
  }
}
