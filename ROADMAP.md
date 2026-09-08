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
- The engine is ~1,100 lines inside a single `useEffect` closure with no module boundaries
- Canvas-only DOM: no semantic text fallback, so screen readers and search engines see almost nothing
- Three renderer experiments (sprite-blit at 1.8× density, bistable latched-dot renderer, coalesce navigation) were built and reverted in Sept 2026. The bistable idea is worth landing after the module split
- No tests, no CI

## Roadmap

Ordered by value. Checked items are done.

- [x] **Delete the wall and the books.** Old docs, dead CSS, guestbook, media store, seed, admin editor, unused SVGs, stale metadata
- [x] **LICENSE** (MIT), README, complete `.env.example`
- [ ] **README GIF** of a page flip
- [ ] **Fix the LinkedIn placeholder** on the about page
- [ ] **Split `FlipdotBoard.tsx`** into `font.ts`, `raster.ts`, `engine.ts`, `scenes/`, with a `strip` mode for the masthead. Prerequisite for everything below
- [ ] **Wipe-to-DOM transition** from the board into HTML pages
- [ ] **Content layer.** Layout with masthead, tokens, MDX, `/work` with GitHub roadmap progress, `/work/kims`, `/about`, `/writing` hidden until the first post
- [ ] **Landing.** Live strip, reactive nav tiles, idle behaviour
- [ ] **Semantic shadow layer.** Emit `BoardText` / `BoardBook` as visually-hidden HTML plus `<noscript>`. Fixes SEO and accessibility in one move since the data is already server-side
- [ ] **Extract the engine** as a standalone package: `createBoard(canvas, { rows, palette, transition })` with `stamp` / `stampImage` / `wrap` / `measure` / `hotspot` and a `compose(page)` callback. Demo page. This is the part strangers would use
- [ ] **Revisit the bistable renderer** once the engine is modular. Measured at 1.65s → 0.19s main-thread per 5s idle before it was reverted
- [ ] OG image, `robots.txt`, `sitemap`
- [ ] Finish or delete the Steam source

## Non-goals

- The media wall or the books shelf
- Comments or any visitor writes
- A CMS for content. MDX in the repo, edited and pushed
