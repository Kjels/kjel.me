import Link from "next/link";
import { PROJECTS, VERB } from "@/content/work";
import { fetchRoadmap, fetchRepo, fetchCommitCount, stamp, gen } from "@/lib/github";
import { Picto } from "@/components/Picto";
import { TickRule } from "@/components/TickRule";

export const metadata = { title: "kjel.me / work" };
export const revalidate = 3600;

// The ledger: one sheet, one cell per project, in the asset book's idiom.
export default async function Work() {
  const rows = await Promise.all(
    PROJECTS.map(async (p) => {
      const [roadmap, repo, commits] = p.repo
        ? await Promise.all([fetchRoadmap(p.repo), fetchRepo(p.repo), fetchCommitCount(p.repo)])
        : [null, null, null];
      return { p, roadmap, repo, commits };
    }),
  );
  const latest = rows.map((r) => r.repo?.pushedAt).filter(Boolean).sort().at(-1);
  return (
    <div className="sheet">
      <i className="reg tl" aria-hidden /><i className="reg tr" aria-hidden /><i className="reg bl" aria-hidden /><i className="reg br" aria-hidden />
      <header className="title">
        <h1>Work <span>·</span> Ledger</h1>
        <p>Vol. 01 <span>·</span> {String(rows.length).padStart(2, "0")} entries{latest && <> <span>·</span> {stamp(latest)}</>}</p>
      </header>
      <ol className="cells">
        {rows.map(({ p, roadmap, repo, commits }, i) => (
          <li key={p.slug} className="cell">
            <Link href={`/work/${p.slug}`} className="cell-link">
              <Picto slug={p.slug} className="cell-picto" />
              <span className="cell-strip">
                <span className="cell-no">{String(i + 1).padStart(2, "0")}</span>
                <span className="cell-name">{p.title}</span>
                <span className="cell-verb">{VERB[p.status]}</span>
              </span>
              <span className="cell-body">
                <span className="cell-blurb">{p.blurb}</span>
                <span className="cell-data">
                  {commits != null && <span>{gen(commits)}</span>}
                  {repo && <span>{stamp(repo.pushedAt)}</span>}
                  {roadmap && roadmap.total > 0 && <TickRule done={roadmap.done} total={roadmap.total} />}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <footer className="title foot">
        <p>Cells live <span>·</span> cells die <span>·</span> the grid remains</p>
        <p>Sheet 01 / 01</p>
      </footer>
    </div>
  );
}
