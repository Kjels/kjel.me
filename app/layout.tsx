import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { VisitPing } from "@/components/VisitPing";
import { BoardShell } from "@/components/BoardShell";
import { getBoardText } from "@/lib/board";
import { PROJECTS } from "@/content/work";
import { fetchRepo, ago } from "@/lib/github";
import type { Live } from "@/components/board/scenes/kjel";

// what the landing says about the ledger: the most recently pushed project
async function getLive(): Promise<Live> {
  const withRepo = PROJECTS.filter((p) => p.repo);
  const repos = await Promise.all(withRepo.map((p) => fetchRepo(p.repo!)));
  let best = -1, when = "";
  repos.forEach((r, i) => { if (r && r.pushedAt > when) { when = r.pushedAt; best = i; } });
  const building = best >= 0 ? withRepo[best].title.toUpperCase() : (PROJECTS.find((p) => p.status === "building")?.title.toUpperCase() ?? "");
  return { building, pushed: when ? ago(when).toUpperCase() : "", entries: PROJECTS.length, place: "BROOKLYN, NY" };
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
