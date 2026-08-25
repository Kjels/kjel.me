import { Feed } from "@/components/Feed";
import { getFeed, getNow, type NowItem } from "@/lib/feed";

// the wall is a hidden page: reachable by URL, unlisted in the board menu
export const metadata = { robots: { index: false, follow: false } };

// re-fetch sources at most once a minute — keeps the wall feeling live
export const revalidate = 60;

export default async function MediaPage() {
  const [items, apiNow] = await Promise.all([getFeed(), getNow()]);

  // surface only "now listening" (Spotify, live) + "now reading" (a marked book)
  const reading: NowItem[] = items
    .filter((i) => i.current && i.medium === "BK")
    .map((i) => ({ medium: i.medium, title: i.title, subtitle: i.subtitle, live: false }));
  const live = [...apiNow, ...reading];

  const now = Date.now();
  return <Feed items={items} now={now} live={live} />;
}
