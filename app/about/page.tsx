export const metadata = { title: "kjel.me / about" };

export default function AboutPage() {
  return (
    <article className="about">
      <h1>Kjel Schlemmer</h1>
      <div className="about-grid">
        <div className="about-bio">
          <p>I build small software. Games, tools, this site.</p>
          <p>Rower turned runner. Fixed gear. Board games.</p>
          <p>By day I design and build the outbound engine at hackajob.</p>
        </div>
        <dl className="fields">
          <div><dt>Place</dt><dd>Brooklyn, NY</dd></div>
          <div><dt>Mail</dt><dd><a href="mailto:hello@kjel.me">hello@kjel.me</a></dd></div>
          <div><dt>Code</dt><dd><a href="https://github.com/Kjels" target="_blank" rel="noreferrer">github.com/Kjels</a></dd></div>
        </dl>
      </div>
    </article>
  );
}
