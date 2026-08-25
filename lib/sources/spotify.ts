
/**
 * Spotify adapter (single-user). Uses a long-lived refresh token to mint
 * access tokens server-side, then pulls what you've been listening to.
 *
 * Env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
 * Returns [] when unconfigured so the site still builds/runs.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";


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
