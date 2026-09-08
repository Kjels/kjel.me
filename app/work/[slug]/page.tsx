import Link from "next/link";
import { notFound } from "next/navigation";
import { PROJECTS, VERB, projectBySlug } from "@/content/work";
import { fetchRoadmap, fetchRepo, fetchCommitCount, stamp, gen } from "@/lib/github";
import { Picto } from "@/components/Picto";
import { TickRule } from "@/components/TickRule";

export const revalidate = 3600;

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = projectBySlug((await params).slug);
  return p ? { title: `kjel.me / ${p.title.toLowerCase()}`, description: p.blurb } : {};
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = projectBySlug(slug);
  if (!p) notFound();
  const no = String(PROJECTS.indexOf(p) + 1).padStart(2, "0");
  const [{ default: Body }, roadmap, repo, commits] = await Promise.all([
    p.body(),
    p.repo ? fetchRoadmap(p.repo) : null,
    p.repo ? fetchRepo(p.repo) : null,
    p.repo ? fetchCommitCount(p.repo) : null,
  ]);
  const todo = roadmap?.items.filter((i) => !i.done) ?? [];
  const done = roadmap?.items.filter((i) => i.done) ?? [];
  return (
    <article className="entry">
      <header className="entry-top">
        <Picto slug={p.slug} className="entry-picto" />
        <div className="entry-title">
          <p className="crumb"><Link href="/work">Work</Link> · {no}</p>
          <h1>{p.title}</h1>
          <p className="entry-blurb">{p.blurb}</p>
        </div>
        <dl className="entry-facts">
          <div><dt>State</dt><dd>{VERB[p.status]}</dd></div>
          <div><dt>Since</dt><dd>{p.started}</dd></div>
          {commits != null && <div><dt>Gen</dt><dd>{gen(commits)}</dd></div>}
          {repo && <div><dt>Pushed</dt><dd>{stamp(repo.pushedAt)}</dd></div>}
        </dl>
      </header>

      <div className="entry-grid">
        <div className="prose">
          <Body />
        </div>
        <aside className="rail">
          <dl className="fields">
            <div><dt>Stack</dt><dd>{p.stack.join(" · ")}</dd></div>
            {(p.repo || p.site) && (
              <div><dt>Links</dt><dd>
                {p.repo && <a href={`https://github.com/${p.repo}`} target="_blank" rel="noreferrer">GitHub</a>}
                {p.repo && p.site && " · "}
                {p.site && <a href={p.site} target="_blank" rel="noreferrer">{p.site.replace(/^https?:\/\//, "")}</a>}
              </dd></div>
            )}
            {roadmap?.status && <div><dt>Status</dt><dd>{roadmap.status}</dd></div>}
          </dl>
          {roadmap && roadmap.total > 0 && (
            <section className="roadmap">
              <h2>Roadmap <TickRule done={roadmap.done} total={roadmap.total} /></h2>
              <ul>
                {todo.map((i) => <li key={i.text}>{i.text}</li>)}
                {done.map((i) => <li key={i.text} data-done>{i.text}</li>)}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
