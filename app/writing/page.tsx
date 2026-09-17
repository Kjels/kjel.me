import { notFound } from "next/navigation";
import { longDate, posts } from "@/content/writing";

export const metadata = { title: "kjel.me / writing", description: "Essays by Kjel Schlemmer." };

// The timetable is a board; this carries the text a search engine or a screen reader should find.
// Writing stays hidden until the first post, so with nothing to list the route does not exist.
export default function Writing() {
  const all = posts();
  if (!all.length) notFound();
  return (
    <div className="sr-only">
      <h1>Writing</h1>
      {all.map((p) => (
        <article key={p.slug}>
          <h2><a href={`/writing/${p.slug}`}>{p.title}</a></h2>
          <p>{longDate(p.date).toLowerCase()}, {p.minutes} min</p>
          {p.lines.map((l) => <p key={l}>{l.toLowerCase()}</p>)}
        </article>
      ))}
    </div>
  );
}
