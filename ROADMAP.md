# Roadmap

**Status: live at [kjel.me](https://kjel.me), v2 shipped 2026-09-10.** The whole site is one `<canvas>` running a simulated flip-dot sign: the landing scrolls as a tall board (home, work ledger, about), each project entry is a board, and the ledger reads every repo's `ROADMAP.md` from GitHub. Only `/config` is HTML.

What's left is the playful list at the bottom and the engine extraction. `docs/v2-scope.md` is the original scope; the HTML-pages plan in it was dropped for all-boards.

## What works today

- Flip-dot engine in `components/board/engine.ts`: 5×7 and 3×5 bitmap fonts, per-dot flip physics with afterglow, fixed row count with fluid dot size so composition is identical on every screen, virtual rows for the scrolling landing, `prefers-reduced-motion` honoured
- Every page is a board: the tall landing (home, ledger, about) and one board per entry. `/config` is the only HTML
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
- [x] **Push the project repos** so the ledger can read their roadmaps
- [ ] **Photos for KIMS** and any other project page that needs them
- [x] **Landing.** Live line (what the ledger is building, last push), menu previews on hover, idle wave using the second portrait, now-playing in the strip
- [x] **The landing scrolls.** A board taller than the screen: home, then WORK as a ledger, then ABOUT, all in dots, stepping a row at a time with dot state carried along so only the leading edge flips. Menu words scroll to sections. `?scroll=snap` for detents
- [x] **Entries are boards.** Name, live lifeform, meta, one-liner, short lines, roadmap ticks, README / SITE / ALL WORK. `/work` and `/about` redirect into the landing. Links ripple on hover and press
- [x] Ticker on the pinned line, home and scrolled alike, one column at a time with no afterglow (`content/speech.ts`). Feeding it the latest commit message is a small next step
- [ ] Arrow keys step the landing one row; space pages
- [ ] 404 as a board
- [x] **GAME OF LIFE.** The one coloured thing on the board: a green word with a glider lapping a 7×7 torus beside it. Opens a blank board: click or drag dots to seed, PLAY runs, PAUSE edits, CLEAR wipes, WHAT IS THIS opens a glass card (HTML over the board, the first of the kind), the word or Esc leaves
- [x] Cursor trail on by default (`C` still cycles none, trail, guides)
- [x] Screen-space layers (clock, pins) leave no afterglow when the landing scrolls
- [ ] Drag to flip dots on the landing, healing after a moment
- [ ] Optional relay click per flip, off by default
- [x] Landing carries its copy as visually-hidden HTML
- [ ] Pictogram boards pause offscreen and in hidden tabs (done); consider the same for the landing board
- [ ] **Extract the engine** (`components/board/`) as a standalone package with a demo page. The `Board` class already has the API; it needs a build and a README
- [ ] **Revisit the bistable renderer** once the engine is modular. Measured at 1.65s → 0.19s main-thread per 5s idle before it was reverted
- [x] OG image in the board's face, `robots.txt`, `sitemap`
- [x] `/config` trimmed to home copy, phone copy, roles

## Non-goals

- The media wall or the books shelf
- Comments or any visitor writes
- A CMS for content. MDX in the repo, edited and pushed
