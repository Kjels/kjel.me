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
    <article className="sheet entry" data-live>
      <i className="reg tl" aria-hidden /><i className="reg tr" aria-hidden /><i className="reg bl" aria-hidden /><i className="reg br" aria-hidden />
      <header className="title">
        <p><Link href="/work">Work <span>·</span> Ledger</Link></p>
        <p>Entry {no} <span>·</span> {VERB[p.status]}{commits != null && <> <span>·</span> {gen(commits)}</>}</p>
      </header>

      <div className="entry-hero">
        <Picto slug={p.slug} pitch={10} className="entry-picto" />
      </div>

      <div className="entry-head">
        <h1>{p.title}</h1>
        <p className="entry-blurb">{p.blurb}</p>
      </div>

      <dl className="fields">
        <div><dt>Status</dt><dd>{p.status}{roadmap?.status ? `. ${roadmap.status}` : ""}</dd></div>
        <div><dt>Since</dt><dd>{p.started}</dd></div>
        {repo && <div><dt>Last push</dt><dd>{stamp(repo.pushedAt)}</dd></div>}
        <div><dt>Stack</dt><dd>{p.stack.join(" · ")}</dd></div>
        {(p.repo || p.site) && (
          <div><dt>Links</dt><dd>
            {p.repo && <a href={`https://github.com/${p.repo}`} target="_blank" rel="noreferrer">GitHub</a>}
            {p.repo && p.site && " · "}
            {p.site && <a href={p.site} target="_blank" rel="noreferrer">{p.site.replace(/^https?:\/\//, "")}</a>}
          </dd></div>
        )}
        {roadmap && roadmap.total > 0 && <div><dt>Roadmap</dt><dd><TickRule done={roadmap.done} total={roadmap.total} /></dd></div>}
      </dl>

      <div className="prose">
        <Body />
      </div>

      {roadmap && roadmap.total > 0 && (
        <section className="roadmap">
          <h2>Roadmap</h2>
          <ul>
            {todo.map((i) => <li key={i.text}>{i.text}</li>)}
            {done.map((i) => <li key={i.text} data-done>{i.text}</li>)}
          </ul>
          <p className="source">{p.repo}/ROADMAP.md</p>
        </section>
      )}

      <footer className="title foot">
        <p>Entry {no}</p>
        <p><Link href="/work">Back to the ledger</Link></p>
      </footer>
    </article>
  );
}
