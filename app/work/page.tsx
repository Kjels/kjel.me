import Link from "next/link";
import { PROJECTS, VERB } from "@/content/work";
import { fetchRoadmap, fetchRepo, fetchCommitCount, gen } from "@/lib/github";
import { Picto } from "@/components/Picto";
import { TickRule } from "@/components/TickRule";

export const metadata = { title: "kjel.me / work" };
export const revalidate = 3600;

// The ledger. Full width, one row per project, hairlines between.
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
      <div className="row head" aria-hidden>
        <span className="c-picto" /><span className="c-no">No.</span><span className="c-name">Entry</span>
        <span className="c-state">State</span><span className="c-since">Since</span><span className="c-gen">Gen</span><span className="c-tick">Roadmap</span>
      </div>
      <ol className="rows">
        {rows.map(({ p, roadmap, commits }, i) => (
          <li key={p.slug}>
            <Link href={`/work/${p.slug}`} className="row">
              <Picto slug={p.slug} className="c-picto" />
              <span className="c-no">{String(i + 1).padStart(2, "0")}</span>
              <span className="c-name">
                <span className="name">{p.title}</span>
                <span className="blurb">{p.blurb}</span>
              </span>
              <span className="c-state">{VERB[p.status]}</span>
              <span className="c-since">{p.started}</span>
              <span className="c-gen">{commits != null ? gen(commits) : ""}</span>
              <span className="c-tick">{roadmap && roadmap.total > 0 ? <TickRule done={roadmap.done} total={roadmap.total} /> : null}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
