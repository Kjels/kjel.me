import Link from "next/link";
import { PROJECTS, VERB } from "@/content/work";
import { fetchRoadmap, fetchRepo, fetchCommitCount, gen } from "@/lib/github";
import { Picto } from "@/components/Picto";
import { TickRule } from "@/components/TickRule";

export const metadata = { title: "kjel.me / work" };
export const revalidate = 3600;

// The ledger. One band per project, full width.
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
    <div className="ledger">
      <h1 className="sr-only">Work</h1>
      <ol className="rows">
        {rows.map(({ p, roadmap, commits }, i) => (
          <li key={p.slug}>
            <Link href={`/work/${p.slug}`} className="row">
              <Picto slug={p.slug} className="c-picto" />
              <span className="c-no">{String(i + 1).padStart(2, "0")}</span>
              <span className="c-main">
                <span className="name">{p.title}</span>
                <span className="meta">
                  <span>{VERB[p.status]}</span>
                  <span>{p.started}</span>
                  {commits != null && <span>{gen(commits)}</span>}
                  {roadmap && roadmap.total > 0 && <TickRule done={roadmap.done} total={roadmap.total} />}
                </span>
              </span>
              <span className="c-blurb">{p.blurb}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
