// One-time: seed media.json in Vercel Blob from the resolved films + books.
// Run: node scripts/migrate-to-blob.mjs
import { put } from "@vercel/blob";
import { readFileSync } from "node:fs";

// load BLOB token from .env.local
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}

const DIR = "/tmp/claude-501/-Users-kjelschlemmer/febd893a-5e22-4863-8231-f11046efc3df/scratchpad/";
const REMOVE = new Set(["bk:we-are-legion-we-are-bob", "bk:the-secret-pulse-of-time"]);

const films = JSON.parse(readFileSync(DIR + "films.json", "utf8")).filter((x) => !REMOVE.has(x.id));
const books = JSON.parse(readFileSync(DIR + "books.json", "utf8")).filter((x) => !REMOVE.has(x.id));

const media = [
  ...films.map((f) => ({
    id: f.id, medium: "FLM", source: "manual",
    title: f.title, subtitle: f.subtitle, image: f.image, aspect: f.aspect,
    url: null, intakeAt: "2026-06-30T00:00:00Z", meta: { Year: f.year },
  })),
  ...books.map((b) => ({
    id: b.id, medium: "BK", source: "manual",
    title: b.title, subtitle: b.subtitle, image: b.image, aspect: b.aspect,
    url: null, intakeAt: "2026-06-30T00:00:00Z",
  })),
];

await put("media.json", JSON.stringify(media), {
  access: "public",
  contentType: "application/json",
  token: process.env.BLOB_READ_WRITE_TOKEN,
  allowOverwrite: true,
  addRandomSuffix: false,
});
console.log(`media.json written: ${films.length} films + ${books.length} books = ${media.length} items`);
