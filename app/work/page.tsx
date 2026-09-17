import { PROJECTS, VERB } from "@/content/work";

export const metadata = { title: "kjel.me / work", description: "Projects by Kjel Schlemmer." };

// The ledger is a board. This carries the text a search engine or a screen reader should find.
export default function Work() {
  return (
    <div className="sr-only">
      <h1>Work</h1>
      {PROJECTS.map((p) => (
        <article key={p.slug}>
          <h2><a href={`/work/${p.slug}`}>{p.title}</a></h2>
          <p>{p.blurb}</p>
          <p>{VERB[p.status].toLowerCase()}, since {p.started}</p>
        </article>
      ))}
    </div>
  );
}
