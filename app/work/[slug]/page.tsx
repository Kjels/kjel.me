import { notFound } from "next/navigation";
import { PROJECTS, projectBySlug } from "@/content/work";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = projectBySlug((await params).slug);
  return p ? { title: `kjel.me / ${p.title.toLowerCase()}`, description: p.blurb } : {};
}

// The entry is a board, mounted in the layout. This route carries the text a
// search engine or screen reader should find, and the way to the long version.
export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = projectBySlug((await params).slug);
  if (!p) notFound();
  return (
    <div className="sr-only">
      <h1>{p.title}</h1>
      <p>{p.blurb}</p>
      {p.lines.map((l) => <p key={l}>{l.toLowerCase()}</p>)}
      {p.repo && <a href={`https://github.com/${p.repo}#readme`}>Read more on GitHub</a>}
    </div>
  );
}
