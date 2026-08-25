// Filter removed items + probe each cover's true dimensions → bake `aspect`.
// Reserving the exact aspect before load kills the masonry "flood-in" reflow.
// Run: node scripts/add-aspect.mjs
import { readFileSync, writeFileSync } from "node:fs";

const DIR = "/tmp/claude-501/-Users-kjelschlemmer/febd893a-5e22-4863-8231-f11046efc3df/scratchpad/";
const REMOVE = new Set([
  "flm:pirates-of-the-caribbean-dead-men-tell-no-tales",
  "bk:the-butcher-of-anderson-station",
]);

function dims(buf) {
  const b = new Uint8Array(buf);
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50) {
    const dv = new DataView(buf);
    return { w: dv.getUint32(16), h: dv.getUint32(20) };
  }
  // JPEG — scan for a Start-Of-Frame marker
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 8) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      const sof = (m >= 0xc0 && m <= 0xcf) && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
      if (sof) {
        const h = (b[i + 5] << 8) | b[i + 6];
        const w = (b[i + 7] << 8) | b[i + 8];
        return { w, h };
      }
      i += 2 + ((b[i + 2] << 8) | b[i + 3]);
    }
  }
  return null;
}

async function probe(list, label) {
  const kept = list.filter((x) => !REMOVE.has(x.id));
  let ok = 0;
  for (const item of kept) {
    if (!item.image) continue;
    try {
      const buf = await (await fetch(item.image)).arrayBuffer();
      const d = dims(buf);
      if (d?.w && d?.h) {
        item.aspect = `${d.w} / ${d.h}`;
        ok++;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 30));
  }
  console.log(`${label}: ${kept.length} items, ${ok} aspects probed`);
  return kept;
}

const films = await probe(JSON.parse(readFileSync(DIR + "films.json", "utf8")), "films");
const books = await probe(JSON.parse(readFileSync(DIR + "books.json", "utf8")), "books");
writeFileSync(DIR + "films.json", JSON.stringify(films, null, 2));
writeFileSync(DIR + "books.json", JSON.stringify(books, null, 2));
console.log("written.");
