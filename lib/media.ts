import type { Medium, Source } from "./types";

interface MediumConfig {
  code: Medium;
  label: string;
  /** aspect ratio for the typographic-cover fallback */
  ratio: string;
  /** big watermark glyph on fallback covers */
  glyph: string;
}

export const MEDIA: Record<Medium, MediumConfig> = {
  MUS: { code: "MUS", label: "Music", ratio: "1 / 1", glyph: "♪" },
  FLM: { code: "FLM", label: "Film", ratio: "2 / 3", glyph: "❖" },
  BK: { code: "BK", label: "Books", ratio: "2 / 3", glyph: "❡" },
  YT: { code: "YT", label: "Video", ratio: "16 / 9", glyph: "▶" },
  GME: { code: "GME", label: "Games", ratio: "2 / 3", glyph: "◈" },
};

/** present-tense verb per medium, for the live "now" line */
export const NOW_VERB: Record<Medium, string> = {
  MUS: "listening",
  FLM: "watching",
  BK: "reading",
  YT: "watching",
  GME: "playing",
};

export const SOURCE_LABEL: Record<Source, string> = {
  spotify: "Spotify",
  youtube: "YouTube",
  goodreads: "Goodreads",
  steam: "Steam",
  manual: "Added by Kjel",
};

/** filter channels, in display order */
export const CHANNELS: { label: string; medium: Medium | "ALL" }[] = [
  { label: "All", medium: "ALL" },
  { label: "Music", medium: "MUS" },
  { label: "Film", medium: "FLM" },
  { label: "Books", medium: "BK" },
  { label: "Games", medium: "GME" },
  // { label: "Video", medium: "YT" }, // deprecated for now — YT plumbing left intact
];

/** "4m ago", "3h ago", "2d ago" — relative, given a reference now */
export function ago(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}
