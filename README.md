# kjel.me

Source for [kjel.me](https://kjel.me). The whole site is one `<canvas>` running a simulated flip-dot sign. Landing, the work ledger, about, and each project entry are boards; the only HTML page is `/config`. Status and what's next in `ROADMAP.md`.

The photos and copy in `lib/board-text.ts`, `content/` and `public/` are mine and not covered by the MIT license on the code.

## How it works

One canvas, one frame loop, mounted once in the root layout by `components/BoardShell.tsx`. A scene composes a page into stamped text and raster layers; the engine turns that into a target per dot and animates each dot toward it with a little thermal mass, so a dot switching off cools through shades instead of snapping. Page changes are a dithered column wipe keyed by a stable per-cell hash.

The grid is a fixed number of rows (141 landscape, 153 portrait) with a fluid dot size, so the composition is identical on a phone and a monitor. Text is a 5x7 bitmap face with a 3x5 small face; the portrait is halftoned onto the same grid.

The landing is taller than the screen. The engine keeps a virtual board and the page scrolls it a row at a time, carrying dot state along so only the leading edge flips. Sections: home, WORK as numbered tiles, ABOUT. `?scroll=snap` settles on whole screens.

Entries (`/work/[slug]`) are boards too: name, meta, a few short lines, roadmap ticks, links to the README and site. The long version of every project is its repo README; the ledger reads each repo's `ROADMAP.md` on GitHub at request time (status line, checkbox count), plus commit count and last push, cached an hour.

## Layout

```
app/
  layout.tsx             mounts the board; every route renders inside it
  page.tsx               the landing (a tall board)
  work/[slug]/           one board per project; /work and /about redirect to /#work and /#about
  config/                board copy editor (password), the one HTML page
  api/board              board copy read/write (Vercel Blob)
  api/now                Spotify now-playing, 25s revalidate
  api/view               visit ping → email
  opengraph-image.tsx    OG image in the board's face; robots, sitemap
components/
  BoardShell.tsx         the canvas, scroll, route transitions, hotspots for links
  board/engine.ts        Board class: grid, dot physics, wipes, layers, virtual rows, cursor modes
  board/font.ts          5x7 and 3x5 bitmap faces
  board/raster.ts        image → dot grid halftoning
  board/portrait.ts      the halftoned photo with chroma-key backdrop removal
  board/palette.ts       dot shades
  board/scenes/kjel.ts   the site: landing, ledger tiles, about, entries, strip
content/
  work/index.ts          the project manifest (slug, repo, status, stack, lines)
  about.ts               the about lines and interests
lib/
  github.ts              ROADMAP.md, repo meta, commit count from GitHub, cached hourly
  board-text.ts          every line the home screen stamps, with defaults
  blob.ts                Blob reads via the public CDN
  sources/spotify.ts     refresh-token flow
  notify.ts              visit emails via Resend
```

## Run it

```
cp .env.example .env.local   # fill in what you need; the board runs with none of it
npm install
npm run dev
```

With no env vars the board renders from `BOARD_DEFAULTS` and the ledger reads public repos anonymously. Spotify, Blob, GitHub token and emails each switch on when their vars are present.

Keys: `C` cycles cursor modes, `Esc` leaves Life. `prefers-reduced-motion` swaps the wipe for a cut.

## Films

The board can play a 1-bit film over every dot: `scripts/encode-film.mjs` turns a video into
frames of on/off cells, each stored as the run-length encoded XOR against the frame before it,
so a silhouette animation costs very little.

```
node scripts/encode-film.mjs input.mp4 public/film/<name>.bin --w 160 --h 120 --fps 20
node scripts/encode-film.mjs --synth public/film/test.bin      # a stand-in, to check the pipeline
```

Register the file under a word in the scene's `codes` map and typing that word on the board plays
it. Esc, a click, or the last frame ends it. Nothing is shown if the file is not there.

## Adding a project

Add an entry to `content/work/index.ts` with the repo as `owner/name`. Give the repo a `ROADMAP.md` with a `**Status: ...**` line and a `- [ ]` checklist; the ledger does the rest.
