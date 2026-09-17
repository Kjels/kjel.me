#!/usr/bin/env node
// npm run post "Title of the piece"
// Writes the MDX file and prints the manifest entry to paste into content/writing/index.ts.
// There is no CMS on purpose: a post is a file in the repo, committed and pushed.
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const title = process.argv.slice(2).join(" ").trim();
if (!title) { console.error('usage: npm run post "Title of the piece"'); process.exit(1); }

const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const date = new Date().toISOString().slice(0, 10);
const file = join("content", "writing", `${slug}.mdx`);
if (existsSync(file)) { console.error(`${file} already exists`); process.exit(1); }

writeFileSync(file, `## \n\n\n`);

console.log(`\n  ${file}\n`);
console.log(`  add to content/writing/index.ts, at the top of POSTS:\n`);
console.log(`  {
    slug: "${slug}",
    title: "${title}",
    date: "${date}",
    lines: ["", "", ""],
    minutes: 0,
    body: () => import("./${slug}.mdx"),
  },\n`);
