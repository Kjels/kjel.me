import type { MediaItem, Medium } from "./types";
import { SEED } from "./seed";
import { getMedia } from "./store";
import { fetchSpotify, fetchSpotifyNow } from "./sources/spotify";
import { fetchSteam } from "./sources/steam";

export interface NowItem {
  medium: Medium;
  title: string;
  subtitle: string;
  /** true = pulled live from an API (breathes); false = manually marked current */
  live: boolean;
}

/** API-pulled live presence — "now listening" (music). Listening + reading are
 *  the only statuses surfaced; watching/in-game are intentionally omitted. */
export async function getNow(): Promise<NowItem[]> {
  const mus = await fetchSpotifyNow().catch(() => null);
  return mus ? [{ medium: "MUS", title: mus.title, subtitle: mus.subtitle, live: true }] : [];
}

export async function getFeed(): Promise<MediaItem[]> {
  const [spotify, steam] = await Promise.allSettled([fetchSpotify(), fetchSteam()]).then((rs) =>
    rs.map((r) => (r.status === "fulfilled" ? r.value : []))
  );

  // hand-curated media now lives in the Blob store (admin-editable);
  // fall back to the static seed if the store is empty.
  const manual = await getMedia();
  const curated = manual.length ? manual : SEED;

  // each source keeps its own order; the All view scatters them in the component,
  // channels filter this and keep per-medium order. "playing now" still leads.
  const all = [...curated, ...spotify, ...steam];
  return [...all.filter((i) => i.liveNow), ...all.filter((i) => !i.liveNow)];
}
