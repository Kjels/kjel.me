import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { VisitPing } from "@/components/VisitPing";
import { BoardShell } from "@/components/BoardShell";
import { getBoardText } from "@/lib/board";
import { PROJECTS, VERB } from "@/content/work";
import { fetchRepo, fetchRoadmap, fetchCommitCount, ago, gen } from "@/lib/github";
import type { Live } from "@/components/board/scenes/kjel";

// what the landing says about the ledger: the most recently pushed project
async function getLive(): Promise<Live> {
  const data = await Promise.all(PROJECTS.map(async (p) => {
    const [repo, roadmap, commits] = p.repo ? await Promise.all([fetchRepo(p.repo), fetchRoadmap(p.repo), fetchCommitCount(p.repo)]) : [null, null, null];
    return { p, repo, roadmap, commits };
  }));
  let best = -1, when = "";
  data.forEach((d, i) => { if (d.repo && d.repo.pushedAt > when) { when = d.repo.pushedAt; best = i; } });
  const building = best >= 0 ? data[best].p.title.toUpperCase() : (PROJECTS.find((p) => p.status === "building")?.title.toUpperCase() ?? "");
  return {
    building, pushed: when ? ago(when).toUpperCase() : "", entries: PROJECTS.length, place: "BROOKLYN, NY",
    ledger: data.map(({ p, repo, roadmap, commits }) => ({
      slug: p.slug, title: p.title, state: VERB[p.status], since: p.started, blurb: p.blurb, lines: p.lines,
      repo: p.repo, site: p.site,
      gen: commits != null ? gen(commits) : null,
      pushed: repo ? ago(repo.pushedAt).toUpperCase() : null,
      roadmap: roadmap ? { done: roadmap.done, total: roadmap.total } : null,
    })),
  };
}

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "kjel.me",
  description: "Kjel Schlemmer. A personal site rendered as a flip-dot sign.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

// The board lives here, above every route, so it persists across navigation:
// full-viewport on the landing, a masthead strip everywhere else.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [text, live] = await Promise.all([getBoardText(), getLive()]);
  return (
    <html lang="en" className={`${plexMono.variable} h-full`}>
      <body className="min-h-full">
        <VisitPing />
        <BoardShell text={text} live={live}>{children}</BoardShell>
      </body>
    </html>
  );
}
