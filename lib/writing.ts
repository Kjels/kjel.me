import { readFileSync } from "node:fs";
import { join } from "node:path";

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type Heading = { id: string; text: string };

/** the section names of a post, read off its MDX at build time */
export function headings(slug: string): Heading[] {
  try {
    const src = readFileSync(join(process.cwd(), "content", "writing", `${slug}.mdx`), "utf8");
    const out: Heading[] = [];
    for (const line of src.split("\n")) {
      const m = /^##\s+(.+?)\s*$/.exec(line);
      if (m) out.push({ id: slugify(m[1]), text: m[1] });
    }
    return out;
  } catch {
    return [];
  }
}
