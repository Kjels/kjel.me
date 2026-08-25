// Resolve book covers — Apple Books first (keyless, hi-res, English/US editions),
// Open Library as fallback. Subtitle uses the supplied author.
// Run: node scripts/resolve-books.mjs   (writes scratchpad/books.json + a check)
import { writeFileSync } from "node:fs";

// [title, author] — order preserved on the wall.
// (Removed per request: "The Churn", "Stranger in a Strange Land".)
const BOOKS = [
  ["Last Argument of Kings", "Joe Abercrombie"],
  ["We Are Legion (We Are Bob)", "Dennis E. Taylor"],
  ["The Sirens of Titan", "Kurt Vonnegut"],
  ["Ringworld", "Larry Niven"],
  ["Children of Time", "Adrian Tchaikovsky"],
  ["Speaker for the Dead", "Orson Scott Card"],
  ["Dark Matter", "Blake Crouch"],
  ["1984", "George Orwell"],
  ["Wind and Truth", "Brandon Sanderson"],
  ["Rhythm of War", "Brandon Sanderson"],
  ["Oathbringer", "Brandon Sanderson"],
  ["Words of Radiance", "Brandon Sanderson"],
  ["Death's End", "Cixin Liu"],
  ["The Dark Forest", "Cixin Liu"],
  ["Leviathan Falls", "James S.A. Corey"],
  ["The Cold Start Problem", "Andrew Chen"],
  ["The Devils", "Joe Abercrombie"],
  ["The Mercy of Gods", "James S.A. Corey"],
  ["The Faith of Beasts", "James S.A. Corey"],
  ["The Secret Pulse of Time", "Stefan Klein"],
  ["The Way of Kings", "Brandon Sanderson"],
  ["The Hero of Ages", "Brandon Sanderson"],
  ["The Well of Ascension", "Brandon Sanderson"],
  ["Mistborn: The Final Empire", "Brandon Sanderson"],
  ["The Blade Itself", "Joe Abercrombie"],
  ["Man's Search for Meaning", "Viktor E. Frankl"],
  ["The Road", "Cormac McCarthy"],
  ["The Stranger", "Albert Camus"],
  ["No Country for Old Men", "Cormac McCarthy"],
  ["Slaughterhouse-Five", "Kurt Vonnegut"],
  ["The Giver", "Lois Lowry"],
  ["Neuromancer", "William Gibson"],
  ["Hyperion", "Dan Simmons"],
  ["The Three-Body Problem", "Cixin Liu"],
  ["The Institute", "Stephen King"],
  ["The Stand", "Stephen King"],
  ["The Power of Now", "Eckhart Tolle"],
  ["The Ocean at the End of the Lane", "Neil Gaiman"],
  ["American Gods", "Neil Gaiman"],
  ["Morning Star", "Pierce Brown"],
  ["Golden Son", "Pierce Brown"],
  ["Red Rising", "Pierce Brown"],
  ["The Goldfinch", "Donna Tartt"],
  ["The Empire's Ruin", "Brian Staveley"],
  ["Skullsworn", "Brian Staveley"],
  ["The Providence of Fire", "Brian Staveley"],
  ["The Emperor's Blades", "Brian Staveley"],
  ["The Last Mortal Bond", "Brian Staveley"],
  ["Tiamat's Wrath", "James S.A. Corey"],
  ["Persepolis Rising", "James S.A. Corey"],
  ["Nemesis Games", "James S.A. Corey"],
  ["Babylon's Ashes", "James S.A. Corey"],
  ["Cibola Burn", "James S.A. Corey"],
  ["Abaddon's Gate", "James S.A. Corey"],
  ["Caliban's War", "James S.A. Corey"],
  ["Leviathan Wakes", "James S.A. Corey"],
  ["The Shadow of the Torturer", "Gene Wolfe"],
  ["Neverwhere", "Neil Gaiman"],
  ["Fahrenheit 451", "Ray Bradbury"],
  ["Brave New World", "Aldous Huxley"],
  ["Dune", "Frank Herbert"],
  ["Ender's Game", "Orson Scott Card"],
  ["The Hitchhiker's Guide to the Galaxy", "Douglas Adams"],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function apple(title, author) {
  const u = `https://itunes.apple.com/search?term=${encodeURIComponent(title + " " + author)}&media=ebook&limit=5&country=US`;
  try {
    const data = await (await fetch(u)).json();
    const results = data.results ?? [];
    const hit =
      results.find((r) => norm(r.trackName) === norm(title)) ||
      results.find((r) => norm(r.trackName).includes(norm(title))) ||
      results[0];
    if (hit?.artworkUrl100) return hit.artworkUrl100.replace("100x100bb", "1200x1200bb");
  } catch {}
  return null;
}

async function openlib(title, author) {
  const q = new URLSearchParams({ title, author, language: "eng", limit: "5", fields: "cover_i" });
  try {
    const data = await (await fetch(`https://openlibrary.org/search.json?${q}`)).json();
    const doc = (data.docs ?? []).find((d) => d.cover_i);
    if (doc) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  } catch {}
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
const misses = [];
for (const [title, author] of BOOKS) {
  let image = await apple(title, author);
  let src = "apple";
  if (!image) {
    // likely an iTunes rate-limit — back off and retry Apple before OL
    await sleep(3000);
    image = await apple(title, author);
  }
  if (!image) {
    image = await openlib(title, author);
    src = "openlib";
  }
  await sleep(900); // pace to avoid throttling
  if (image) {
    out.push({ id: `bk:${slug(title)}`, title, subtitle: author, image });
    console.log(`✓ [${src}] ${title} — ${author}`);
  } else {
    misses.push(`${title} — ${author}`);
    console.log(`✗ ${title} — ${author}  NO COVER`);
  }
}

writeFileSync("/tmp/claude-501/-Users-kjelschlemmer/febd893a-5e22-4863-8231-f11046efc3df/scratchpad/books.json", JSON.stringify(out, null, 2));
console.log(`\n${out.length}/${BOOKS.length} resolved. Missing: ${misses.join("; ") || "none"}`);
