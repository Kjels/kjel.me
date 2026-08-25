import type { Medium } from "./types";

/** Parse intrinsic dimensions from JPEG/PNG bytes → "W / H" aspect string. */
async function probeAspect(url: string): Promise<string | undefined> {
  try {
    const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      const dv = new DataView(buf.buffer);
      return `${dv.getUint32(16)} / ${dv.getUint32(20)}`;
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length - 8) {
        if (buf[i] !== 0xff) { i++; continue; }
        const m = buf[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return `${(buf[i + 7] << 8) | buf[i + 8]} / ${(buf[i + 5] << 8) | buf[i + 6]}`;
        }
        i += 2 + ((buf[i + 2] << 8) | buf[i + 3]);
      }
    }
  } catch {}
  return undefined;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function resolveFilm(title: string, year?: string) {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  const yq = year ? `&year=${year}` : "";
  const s = await (await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(title)}${yq}`)).json();
  const hit = (s.results ?? [])[0];
  if (!hit) return null;
  const d = await (await fetch(`https://api.themoviedb.org/3/movie/${hit.id}?api_key=${key}&append_to_response=credits`)).json();
  const director = (d.credits?.crew ?? []).find((c: { job: string }) => c.job === "Director")?.name ?? "";
  const image = hit.poster_path ? `https://image.tmdb.org/t/p/w500${hit.poster_path}` : null;
  return { title: hit.title as string, subtitle: director, image, meta: { Year: (hit.release_date || "").slice(0, 4) } };
}

async function resolveBook(title: string, author?: string) {
  const term = `${title} ${author ?? ""}`.trim();
  const data = await (await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=ebook&limit=5&country=US`)).json();
  const results = data.results ?? [];
  const hit =
    results.find((r: { trackName: string }) => norm(r.trackName) === norm(title)) ||
    results.find((r: { trackName: string }) => norm(r.trackName).includes(norm(title))) ||
    results[0];
  if (!hit?.artworkUrl100) return null;
  return {
    title,
    subtitle: author || hit.artistName || "",
    image: hit.artworkUrl100.replace("100x100bb", "1200x1200bb"),
    meta: {},
  };
}

/** Auto-fill cover + subtitle + aspect for a manual add. */
export async function resolveCover(
  medium: Medium,
  opts: { title: string; author?: string; year?: string }
) {
  const r = medium === "FLM" ? await resolveFilm(opts.title, opts.year) : await resolveBook(opts.title, opts.author);
  if (!r) return null;
  const aspect = r.image ? await probeAspect(r.image) : undefined;
  return { ...r, aspect };
}
