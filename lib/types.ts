export type Medium = "MUS" | "FLM" | "BK" | "YT" | "GME";

export type Source = "spotify" | "youtube" | "goodreads" | "steam" | "manual";

export interface MediaItem {
  /** stable id, namespaced by source e.g. "spotify:track:123" */
  id: string;
  medium: Medium;
  source: Source;
  title: string;
  /** creator / author / artist / channel */
  subtitle: string;
  /** cover art, poster, thumbnail — null falls back to a typographic cover */
  image: string | null;
  /** true image aspect ratio (CSS value, e.g. "2 / 3") so space is reserved before load */
  aspect?: string;
  /** link out to the item on its source */
  url: string | null;
  /** ISO timestamp this entered intake (liked / logged / saved) */
  intakeAt: string;
  /** genuinely happening right now (Spotify now-playing / Steam in-game) */
  liveNow?: boolean;
  /** admin-pinned to lead the homepage (in array order); rest scatters behind */
  pinned?: boolean;
  /** books: shelf placement — read (default), reading, or the to-be-read pile */
  status?: "read" | "reading" | "tbr";
  /** books: Kjel's rating, 1-5 */
  rating?: number;
  /** books: the write-up shown on the book's own page */
  review?: string;
  /** books: genre tag — tagged books grow genre shelves on the board */
  genre?: string;
  /** admin-marked as "currently into" — surfaces in the Now block (e.g. now reading) */
  current?: boolean;
  /** Kjel's own note — the tile's B-side, shown on flip and in the sheet */
  notes?: string;
  /** freeform extra detail shown in the drill-down sheet */
  meta?: Record<string, string>;
}

export interface Comment {
  id: string;
  /** null = top-level; otherwise the comment it replies to */
  parentId: string | null;
  /** null/empty = Anonymous */
  name: string | null;
  body: string;
  /** posted by Kjel (admin) — rendered with a colored badge */
  isAdmin: boolean;
  createdAt: string;
  /** soft-delete */
  hidden?: boolean;
}
