import Link from "next/link";

export const metadata = { title: "kjel.me / not found" };

export default function NotFound() {
  return (
    <article className="about">
      <h1>Nothing here.</h1>
      <div className="about-grid">
        <div className="about-bio"><p>The page you asked for doesn’t exist, or it moved.</p></div>
        <dl className="fields">
          <div><dt>Go to</dt><dd><Link href="/">The sign</Link> · <Link href="/work">Work</Link> · <Link href="/about">About</Link></dd></div>
        </dl>
      </div>
    </article>
  );
}
