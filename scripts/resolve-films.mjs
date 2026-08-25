// Resolve film posters + directors via TMDB and emit seed entries.
// Run: node scripts/resolve-films.mjs   (writes scratchpad/films.json + prints a check)
import { readFileSync, writeFileSync } from "node:fs";

const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of txt.split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2];
}
const KEY = process.env.TMDB_API_KEY;

// [title, year] — order preserved on the wall. No ratings/reviews.
const FILMS = [
  ["Fight Club", 1999], ["Parasite", 2019], ["The Shining", 1980],
  ["Scott Pilgrim vs. the World", 2010], ["Her", 2013],
  ["The Shawshank Redemption", 1994], ["Dunkirk", 2017], ["Taxi Driver", 1976],
  ["Catch Me If You Can", 2002], ["Drive", 2011], ["Marriage Story", 2019],
  ["Uncut Gems", 2019], ["Superbad", 2007], ["Reservoir Dogs", 1992],
  ["Ex Machina", 2015], ["Saltburn", 2023], ["Fargo", 1996], ["Trainspotting", 1996],
  ["Isle of Dogs", 2018], ["The Princess Bride", 1987], ["Kiki's Delivery Service", 1989],
  ["Green Book", 2018], ["28 Days Later", 2002], ["American History X", 1998],
  ["Monty Python and the Holy Grail", 1975], ["Akira", 1988],
  ["Snatch", 2000], ["The Killing of a Sacred Deer", 2017],
  ["The Good, the Bad and the Ugly", 1966], ["Into the Wild", 2007],
  ["Moonrise Kingdom", 2012], ["Chainsaw Man – The Movie: Reze Arc", 2025],
  ["One Flew Over the Cuckoo's Nest", 1975], ["The Lighthouse", 2019],
  ["Grave of the Fireflies", 1988], ["Once Upon a Time... in Hollywood", 2019],
  ["The Nightmare Before Christmas", 1993], ["The Rocky Horror Picture Show", 1975],
  ["Baby Driver", 2017], ["There Will Be Blood", 2007], ["Requiem for a Dream", 2000],
  ["No Country for Old Men", 2007], ["Blade Runner 2049", 2017], ["Django Unchained", 2012],
  ["Arrival", 2016], ["Princess Mononoke", 1997], ["Donnie Darko", 2001],
  ["Spirited Away", 2001], ["Fantastic Mr. Fox", 2009],
  ["Everything Everywhere All at Once", 2022], ["Good Will Hunting", 1997],
  ["Whiplash", 2014], ["The Perks of Being a Wallflower", 2012],
  ["Dead Poets Society", 1989], ["Eternal Sunshine of the Spotless Mind", 2004],
  ["La La Land", 2016], ["Poor Things", 2023], ["Ford v Ferrari", 2019],
  ["Flow", 2024], ["The Grand Budapest Hotel", 2014],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const out = [];
const misses = [];

for (const [title, year] of FILMS) {
  const s = await (
    await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${KEY}&query=${encodeURIComponent(title)}&year=${year}`)
  ).json();
  const hit = (s.results ?? [])[0];
  if (!hit) {
    misses.push(`${title} (${year})`);
    console.log(`✗ ${title} (${year}) → NO MATCH`);
    continue;
  }
  const d = await (
    await fetch(`https://api.themoviedb.org/3/movie/${hit.id}?api_key=${KEY}&append_to_response=credits`)
  ).json();
  const director = (d.credits?.crew ?? []).find((c) => c.job === "Director")?.name ?? "";
  out.push({
    id: `flm:${slug(title)}`,
    title: hit.title,
    subtitle: director,
    image: hit.poster_path ? `https://image.tmdb.org/t/p/w500${hit.poster_path}` : null,
    year: String(year),
  });
  console.log(`✓ ${title} (${year}) → ${hit.title} (${(hit.release_date || "").slice(0, 4)}) · ${director || "?"} · ${hit.poster_path ? "poster" : "NO POSTER"}`);
  await new Promise((r) => setTimeout(r, 80));
}

writeFileSync("/tmp/claude-501/-Users-kjelschlemmer/febd893a-5e22-4863-8231-f11046efc3df/scratchpad/films.json", JSON.stringify(out, null, 2));
console.log(`\n${out.length}/${FILMS.length} resolved. Missing: ${misses.join(", ") || "none"}`);
