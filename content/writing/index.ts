// The posts, newest first. This is the single source for everything the board and
// the archive need to know. The body of each post is the MDX file beside it.
//

export type Post = {
  slug: string;
  title: string;
  /** YYYY-MM-DD. drives the ledger date, the archive grouping and the sort */
  date: string;
  /** one line, what it is. the board shows this under the title */
  lines: string[];
  /** minutes, right-aligned on the board the way SINCE is on the work ledger */
  minutes: number;
  /** true while it is a draft: kept out of the board and the archive */
  draft?: boolean;
  body: () => Promise<{ default: React.ComponentType }>;
};

// No posts yet. `npm run post "Title"` writes the MDX and prints the entry to paste here.
export const POSTS: Post[] = [];

/** everything published, newest first */
export const posts = () => POSTS.filter((p) => !p.draft).sort((a, b) => b.date.localeCompare(a.date));

/** what the board shows: a departures board lists the next few, not the whole timetable */
export const BOARD_POSTS = 5;

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug && !p.draft);

/** posts grouped by year, newest year first — how the archive reads */
export function byYear(list = posts()) {
  const years = new Map<string, Post[]>();
  for (const p of list) {
    const y = p.date.slice(0, 4);
    if (!years.has(y)) years.set(y, []);
    years.get(y)!.push(p);
  }
  return [...years.entries()];
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
/** 2026-09-16 -> "09.16", the departures-board date at the margin */
export const dotDate = (d: string) => d.slice(5, 7) + "." + d.slice(8, 10);
/** 2026-09-16 -> "16 SEP 2026", for the archive and the post head */
export const longDate = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
