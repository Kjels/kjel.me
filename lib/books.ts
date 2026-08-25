import { getMedia } from "./store";
import { SEED } from "./seed";
import type { MediaItem } from "./types";
import type { BoardBook } from "./board-text";

/** URL slug for a book — from the title, stable enough for a personal catalog. */
export function bookSlug(b: MediaItem): string {
  return b.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export interface Shelves {
  reading: MediaItem[];
  pile: MediaItem[]; // to-be-read
  shelf: MediaItem[]; // read — favorites (by rating) first, then store order
}

export async function getBooks(): Promise<Shelves> {
  const manual = await getMedia();
  const items = (manual.length ? manual : SEED).filter((m) => m.medium === "BK");
  const reading = items.filter((b) => b.status === "reading" || (b.current && b.status !== "tbr"));
  const pile = items.filter((b) => b.status === "tbr");
  const shelf = items
    .filter((b) => !reading.includes(b) && b.status !== "tbr")
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return { reading, pile, shelf };
}

export async function findBook(slug: string): Promise<MediaItem | null> {
  const manual = await getMedia();
  const items = (manual.length ? manual : SEED).filter((m) => m.medium === "BK");
  return items.find((b) => bookSlug(b) === slug) ?? null;
}

/** Every book, flattened for the flip-dot board. */
export async function getBoardBooks(): Promise<BoardBook[]> {
  const manual = await getMedia();
  const items = (manual.length ? manual : SEED).filter((m) => m.medium === "BK");
  return items.map((b) => ({
    slug: bookSlug(b),
    title: b.title,
    author: b.subtitle,
    rating: b.rating,
    status: b.status ?? (b.current ? "reading" : "read"),
    genre: b.genre,
    review: b.review ?? b.notes ?? undefined,
    url: b.url,
    intakeAt: b.intakeAt,
  }));
}
