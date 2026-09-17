import Link from "next/link";
import { notFound } from "next/navigation";
import { DotText } from "@/components/DotText";
import { ReadingRail } from "@/components/writing/ReadingRail";
import { GliderMark } from "@/components/writing/GliderMark";
import { headings } from "@/lib/writing";
import { POSTS, longDate, postBySlug, posts } from "@/content/writing";

export function generateStaticParams() {
  return POSTS.filter((p) => !p.draft).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = postBySlug((await params).slug);
  return p ? { title: `kjel.me / ${p.title.toLowerCase()}`, description: p.lines[0].toLowerCase() } : {};
}

// A piece. The sign keeps the masthead, the rail says where you are, and the rest of the page is
// one column of type. No rules, no indents, nothing framed.
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const p = postBySlug((await params).slug);
  if (!p) notFound();
  const all = posts();
  const older = all[all.findIndex((x) => x.slug === p.slug) + 1];
  const { default: Body } = await p.body();
  const heads = headings(p.slug);

  return (
    <article className="post">
      <header className="post-head">
        <h1>{p.title}</h1>
        <p className="post-when">
          <DotText text={`${longDate(p.date)} / ${p.minutes} MIN`} micro scale={0.7} />
        </p>
      </header>

      <div className="post-cols">
        <ReadingRail headings={heads} />
        <div className="post-body prose">
          <Body />
        </div>
      </div>

      <footer className="post-foot">
        <GliderMark />
        <nav className="post-next" aria-label="More writing">
          {older ? (
            <Link href={`/writing/${older.slug}`}>
              <span className="mono">Older</span>
              <strong>{older.title}</strong>
            </Link>
          ) : <span />}
          <Link className="post-all mono" href="/writing">All writing</Link>
        </nav>
      </footer>
    </article>
  );
}
