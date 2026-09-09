import { PROJECTS, VERB } from "@/content/work";
import { fetchRoadmap, fetchRepo, fetchCommitCount, gen, stamp } from "@/lib/github";
import { WorkCard } from "@/components/WorkCard";

export const metadata = { title: "kjel.me / work" };
export const revalidate = 3600;

export default async function Work() {
  const cards = await Promise.all(
    PROJECTS.map(async (p) => {
      const [roadmap, repo, commits] = p.repo
        ? await Promise.all([fetchRoadmap(p.repo), fetchRepo(p.repo), fetchCommitCount(p.repo)])
        : [null, null, null];
      return {
        slug: p.slug, title: p.title, blurb: p.blurb, verb: VERB[p.status], started: p.started,
        stack: p.stack, repo: p.repo, site: p.site,
        gen: commits != null ? gen(commits) : null,
        pushed: repo ? stamp(repo.pushedAt) : null,
        roadmap: roadmap ? { done: roadmap.done, total: roadmap.total } : null,
      };
    }),
  );
  return (
    <div className="work">
      <h1 className="sr-only">Work</h1>
      <ol className="cards">
        {cards.map((d, i) => <WorkCard key={d.slug} d={d} index={i} />)}
      </ol>
    </div>
  );
}
