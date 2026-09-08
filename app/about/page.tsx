export const metadata = { title: "kjel.me / about" };

// 4E, the label. Fields, a hatch band, a serial. Nothing else.
export default function AboutPage() {
  return (
    <article className="sheet label">
      <i className="reg tl" aria-hidden /><i className="reg tr" aria-hidden /><i className="reg bl" aria-hidden /><i className="reg br" aria-hidden />
      <header className="title">
        <p>This side up</p>
        <p aria-hidden>↑</p>
      </header>
      <h1 className="label-name">Kjel Halsey<br />Schlemmer</h1>
      <dl className="fields big">
        <div><dt>Contents</dt><dd>Ideas, mostly</dd></div>
        <div><dt>Handle</dt><dd>With curiosity</dd></div>
        <div><dt>Location</dt><dd>Brooklyn, NY</dd></div>
        <div><dt>Days</dt><dd>Design and build the outbound engine at hackajob</dd></div>
        <div><dt>Otherwise</dt><dd>Rower turned runner · fixed gear · board games · small software</dd></div>
        <div><dt>Contact</dt><dd><a href="mailto:hello@kjel.me">hello@kjel.me</a> · <a href="https://github.com/Kjels" target="_blank" rel="noreferrer">GitHub</a></dd></div>
        <div><dt>Serial</dt><dd>No. 000001</dd></div>
      </dl>
      <div className="hatch" aria-hidden />
      <footer className="title foot">
        <p>Fragile <span>·</span> tinkered <span>·</span> no coasting</p>
        <p>KJEL</p>
      </footer>
    </article>
  );
}
