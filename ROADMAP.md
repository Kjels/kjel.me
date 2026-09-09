# Roadmap

**Status: live at [kjel.me](https://kjel.me), v2 in progress.** The whole site is one `<canvas>` running a simulated flip-dot sign: bitmap-font text, dithered page wipes, a halftoned portrait, live Spotify now-playing. Board copy is edited at `/config` and stored in Vercel Blob.

v2 keeps the board as the landing and adds HTML pages for work, writing, and about under a board masthead. Scope in `docs/v2-scope.md`.

## What works today

- Flip-dot engine in `components/FlipdotBoard.tsx`: 5×7 and 3×5 bitmap fonts, per-dot flip physics with afterglow, fixed row count with fluid dot size so composition is identical on every screen, `prefers-reduced-motion` honoured
- Pages via hash routing, all in-board: home, work, now, about, notes
- Raster → dot-grid halftoning, used for the portrait with chroma-key backdrop removal
- Live Spotify line via refresh-token flow and a 25s-revalidated `/api/now`, polled only while the tab is visible
- Board copy in Vercel Blob, edited at `/config`, validated server-side, revalidated on write. Reads go through the public CDN URL to stay inside the Hobby "advanced operations" quota
- Visit notification emails via Resend with geo, bot filter, daily cap, and a self-mute for the owner
- Shared-password admin cookie guarding every mutating route

## Known gaps

- LinkedIn link on the about page is a placeholder URL
- Steam source is half-wired: env vars and types exist, no reader
- The landing is canvas-only; the HTML pages are indexable, the landing has one hidden heading
- Three renderer experiments (sprite-blit at 1.8× density, bistable latched-dot renderer, coalesce navigation) were built and reverted in Sept 2026. The bistable idea is worth landing after the module split
- No tests, no CI

## Roadmap

Ordered by value. Checked items are done.

- [x] **Delete the wall and the books.** Old docs, dead CSS, guestbook, media store, seed, admin editor, unused SVGs, stale metadata
- [x] **LICENSE** (MIT), README, complete `.env.example`
- [ ] **README GIF** of a page flip
- [ ] **Fix the LinkedIn placeholder** on the about page
- [x] **Split `FlipdotBoard.tsx`** into `font.ts`, `raster.ts`, `engine.ts`, `scenes/`, with a `strip` mode for the masthead
- [x] **Wipe-to-DOM transition** from the board into HTML pages, canvas refit per frame while it resizes
- [x] **Content layer.** Layout with masthead, MDX, `/work` with GitHub roadmap progress, `/work/[slug]`, `/about`. `/writing` waits for the first post
- [x] **Work as cards.** Floating cards that flip like a dot on hover or focus (Details toggle on touch). Each project's mark is a lifeform from the identity's fauna run live under B3/S23 on an 11-cell torus. Life verbs for state, GEN from the commit count, tick rule for the roadmap. Entry pages with a sticky rail and prev/next. Helvetica only on content pages
- [x] **Interface guidelines pass** (vercel-labs/web-interface-guidelines): focus rings, 44px targets, touch-action, theme colour, color-scheme, skip link, reduced motion, tabular numbers, curly quotes, anchored headings, a 404 with exits
- [ ] **Push the project repos** so `/work` can read their roadmaps. Until then the progress bars are empty
- [ ] **Photos for KIMS** and any other project page that needs them
- [ ] **Landing.** Live strip, reactive nav tiles, idle behaviour
- [ ] **Semantic shadow layer** for the landing: emit the board copy as visually-hidden HTML plus `<noscript>`
- [ ] **Extract the engine** (`components/board/`) as a standalone package with a demo page. The `Board` class already has the API; it needs a build and a README
- [ ] **Revisit the bistable renderer** once the engine is modular. Measured at 1.65s → 0.19s main-thread per 5s idle before it was reverted
- [ ] OG image, `robots.txt`, `sitemap`
- [ ] Trim `/config` to the fields the board still uses (home copy, roles, place, links)

## Non-goals

- The media wall or the books shelf
- Comments or any visitor writes
- A CMS for content. MDX in the repo, edited and pushed
