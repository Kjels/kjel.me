import Link from "next/link";
import { PROJECTS, VERB } from "@/content/work";
import { fetchRoadmap, fetchRepo, fetchCommitCount, gen } from "@/lib/github";
import { Picto } from "@/components/Picto";
import { TickRule } from "@/components/TickRule";

export const metadata = { title: "kjel.me / work" };
export const revalidate = 3600;

export default async function Work() {
  const rows = await Promise.all(
    PROJECTS.map(async (p) => {
      const [roadmap, repo, commits] = p.repo
        ? await Promise.all([fetchRoadmap(p.repo), fetchRepo(p.repo), fetchCommitCount(p.repo)])
        : [null, null, null];
      return { p, roadmap, repo, commits };
    }),
  );
  return (
    <div className="work">
      <h1 className="sr-only">Work</h1>
      <ol className="cards">
        {rows.map(({ p, roadmap, commits }, i) => (
          <li key={p.slug}>
            <Link href={`/work/${p.slug}`} className="card">
              <span className="card-top">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <span>{VERB[p.status]}</span>
              </span>
              <Picto slug={p.slug} className="card-mark" />
              <span className="card-name">{p.title}</span>
              <span className="card-blurb">{p.blurb}</span>
              <span className="card-meta">
                <span>{p.started}</span>
                {commits != null && <span>{gen(commits)}</span>}
                {roadmap && roadmap.total > 0 && <TickRule done={roadmap.done} total={roadmap.total} />}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
