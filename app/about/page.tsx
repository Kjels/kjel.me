import About from "@/content/about.mdx";

export const metadata = { title: "kjel.me / about" };

export default function AboutPage() {
  return (
    <article className="page">
      <header className="page-head">
        <p className="label mono">About</p>
        <h1>Kjel Schlemmer</h1>
      </header>
      <div className="prose"><About /></div>
      <p className="mono meta contact">
        <a href="mailto:hello@kjel.me">hello@kjel.me</a>
        <a href="https://github.com/Kjels" target="_blank" rel="noreferrer">GitHub</a>
      </p>
    </article>
  );
}
