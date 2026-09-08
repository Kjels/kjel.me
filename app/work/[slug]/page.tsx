import Link from "next/link";
import { notFound } from "next/navigation";
import { PROJECTS, projectBySlug } from "@/content/work";
import { fetchRoadmap, fetchRepo, ago } from "@/lib/github";
import { DotBar } from "@/components/DotBar";

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
  const [{ default: Body }, roadmap, repo] = await Promise.all([
    p.body(),
    p.repo ? fetchRoadmap(p.repo) : null,
    p.repo ? fetchRepo(p.repo) : null,
  ]);
  const todo = roadmap?.items.filter((i) => !i.done) ?? [];
  const done = roadmap?.items.filter((i) => i.done) ?? [];
  return (
    <article className="page">
      <header className="page-head">
        <p className="label mono"><Link href="/work">Work</Link> / {p.title}</p>
        <h1>{p.blurb}</h1>
        <dl className="facts mono">
          <div><dt>Status</dt><dd data-status={p.status}>{p.status}{roadmap?.status ? `. ${roadmap.status}` : ""}</dd></div>
          <div><dt>Since</dt><dd>{p.started}</dd></div>
          <div><dt>Stack</dt><dd>{p.stack.join(", ")}</dd></div>
          {repo && <div><dt>Last push</dt><dd>{ago(repo.pushedAt)}</dd></div>}
          {(p.repo || p.site) && (
            <div><dt>Links</dt><dd>
              {p.repo && <a href={`https://github.com/${p.repo}`} target="_blank" rel="noreferrer">GitHub</a>}
              {p.repo && p.site && " · "}
              {p.site && <a href={p.site} target="_blank" rel="noreferrer">{p.site.replace(/^https?:\/\//, "")}</a>}
            </dd></div>
          )}
        </dl>
        {roadmap && roadmap.total > 0 && <DotBar done={roadmap.done} total={roadmap.total} />}
      </header>

      <div className="prose">
        <Body />
      </div>

      {roadmap && roadmap.total > 0 && (
        <section className="roadmap">
          <h2 className="label mono">Roadmap</h2>
          <ul>
            {todo.map((i) => <li key={i.text}>{i.text}</li>)}
            {done.map((i) => <li key={i.text} data-done>{i.text}</li>)}
          </ul>
          <p className="mono meta">from {p.repo}/ROADMAP.md</p>
        </section>
      )}
    </article>
  );
}
