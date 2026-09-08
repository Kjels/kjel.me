// What GitHub knows about a project: the roadmap ledger and repo metadata.
// Read at request time, cached an hour. Private repos need GITHUB_TOKEN;
// without it public repos still work via raw.githubusercontent.com.

export type Roadmap = {
  /** the bold status line at the top of ROADMAP.md, without the "Status:" prefix */
  status: string;
  done: number;
  total: number;
  /** the "## Why" section as plain paragraphs, if the file has one */
  why: string[];
  items: { text: string; done: boolean }[];
};

export type RepoMeta = { pushedAt: string; stars: number; language: string | null; url: string };

const REVALIDATE = 3600;
const token = () => process.env.GITHUB_TOKEN;

async function readFile(repo: string, path: string): Promise<string | null> {
  try {
    if (token()) {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        headers: { Authorization: `Bearer ${token()}`, Accept: "application/vnd.github.raw+json" },
        next: { revalidate: REVALIDATE },
      });
      return res.ok ? await res.text() : null;
    }
    for (const branch of ["main", "master"]) {
      const res = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/${path}`, { next: { revalidate: REVALIDATE } });
      if (res.ok) return await res.text();
    }
    return null;
  } catch {
    return null;
  }
}

export function parseRoadmap(md: string): Roadmap {
  const status = ((md.match(/\*\*Status:\s*([^*]+)\*\*/) || [])[1] ?? "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
  const items: Roadmap["items"] = [];
  for (const m of md.matchAll(/^- \[( |x|X)\]\s+(.+)$/gm)) {
    // strip markdown bold and trailing detail after the first sentence for the list
    items.push({ done: m[1] !== " ", text: m[2].replace(/\*\*/g, "").trim() });
  }
  const whySec = md.split(/^## Why\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  const why = whySec.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  return { status, done: items.filter((i) => i.done).length, total: items.length, why, items };
}

export async function fetchRoadmap(repo: string): Promise<Roadmap | null> {
  const md = await readFile(repo, "ROADMAP.md");
  return md ? parseRoadmap(md) : null;
}

export async function fetchRepo(repo: string): Promise<RepoMeta | null> {
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers, next: { revalidate: REVALIDATE } });
    if (!res.ok) return null;
    const d = await res.json();
    return { pushedAt: d.pushed_at, stars: d.stargazers_count ?? 0, language: d.language ?? null, url: d.html_url };
  } catch {
    return null;
  }
}

/** "2h ago", "3d ago", "5w ago" */
export function ago(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 9) return `${w}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
