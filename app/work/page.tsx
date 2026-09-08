import Link from "next/link";
import { PROJECTS } from "@/content/work";
import { fetchRoadmap, fetchRepo, ago } from "@/lib/github";
import { DotBar } from "@/components/DotBar";

export const metadata = { title: "kjel.me / work" };
export const revalidate = 3600;

export default async function Work() {
  const rows = await Promise.all(
    PROJECTS.map(async (p) => {
      const [roadmap, repo] = p.repo ? await Promise.all([fetchRoadmap(p.repo), fetchRepo(p.repo)]) : [null, null];
      return { p, roadmap, repo };
    }),
  );
  return (
    <div className="page wide">
      <header className="page-head">
        <h1>Work</h1>
      </header>
      <ol className="projects">
        {rows.map(({ p, roadmap, repo }) => (
          <li key={p.slug} className="project">
            <div className="project-top">
              <h2><Link href={`/work/${p.slug}`}>{p.title}</Link></h2>
              <span className="mono label status" data-status={p.status}>{p.status}</span>
            </div>
            <p className="project-blurb">{p.blurb}</p>
            {roadmap && roadmap.total > 0 && <DotBar done={roadmap.done} total={roadmap.total} />}
            <p className="mono meta">
              {repo && <span>pushed {ago(repo.pushedAt)}</span>}
              {p.repo && <a href={`https://github.com/${p.repo}`} target="_blank" rel="noreferrer">GitHub</a>}
              {p.site && <a href={p.site} target="_blank" rel="noreferrer">Site</a>}
              <span>since {p.started}</span>
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
