import type { MediaItem } from "./types";
import { readJson, writeJson } from "./blob";

const MEDIA_KEY = "media.json";

/** Hand-curated media (films, books, manual additions), ordered. */
export async function getMedia(): Promise<MediaItem[]> {
  return readJson<MediaItem[]>(MEDIA_KEY, []);
}

export async function saveMedia(items: MediaItem[]): Promise<void> {
  await writeJson(MEDIA_KEY, items);
}

export async function addMedia(item: MediaItem): Promise<MediaItem[]> {
  const items = await getMedia();
  items.unshift(item); // newest curation leads its channel
  await saveMedia(items);
  return items;
}

export async function updateMedia(id: string, patch: Partial<MediaItem>): Promise<MediaItem[]> {
  const items = await getMedia();
  const next = items.map((i) => (i.id === id ? { ...i, ...patch, id: i.id } : i));
  await saveMedia(next);
  return next;
}

export async function deleteMedia(id: string): Promise<MediaItem[]> {
  const next = (await getMedia()).filter((i) => i.id !== id);
  await saveMedia(next);
  return next;
}

/** Mark an item as "currently into" (now reading/watching). One current item per medium. */
export async function setCurrent(id: string, current: boolean): Promise<MediaItem[]> {
  const items = await getMedia();
  const target = items.find((i) => i.id === id);
  if (!target) return items;
  const next = items.map((i) => {
    if (i.id === id) return { ...i, current };
    // clear any other "current" in the same medium so there's one at a time
    if (current && i.medium === target.medium && i.current) return { ...i, current: false };
    return i;
  });
  await saveMedia(next);
  return next;
}

/** Pin/unpin; pinning floats the item to the front so pinned items cluster + order cleanly. */
export async function pinMedia(id: string, pinned: boolean): Promise<MediaItem[]> {
  const items = await getMedia();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return items;
  const [item] = items.splice(idx, 1);
  item.pinned = pinned;
  if (pinned) items.unshift(item);
  else items.push(item);
  await saveMedia(items);
  return items;
}

/** Move an item to a new index (admin reorder). */
export async function reorderMedia(id: string, toIndex: number): Promise<MediaItem[]> {
  const items = await getMedia();
  const from = items.findIndex((i) => i.id === id);
  if (from < 0) return items;
  const [moved] = items.splice(from, 1);
  items.splice(Math.max(0, Math.min(toIndex, items.length)), 0, moved);
  await saveMedia(items);
  return items;
}
