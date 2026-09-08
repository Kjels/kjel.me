# kjel.me

Source for [kjel.me](https://kjel.me). The landing page is a simulated flip-dot sign rendered on a single canvas: bitmap-font text, per-dot flip physics with afterglow, dithered page wipes, a halftoned portrait, and a live Spotify line. Behind it, a small site: work, writing, about.

The photos and text in `lib/board-text.ts` and `public/` are mine and not covered by the MIT license on the code.

## Layout

```
app/
  page.tsx               the board, full viewport
  config/                board copy editor (password)
  api/board              board copy read/write (Blob)
  api/now                Spotify now-playing, 25s revalidate
  api/view               visit ping → email
components/
  FlipdotBoard.tsx       the renderer and every board page
lib/
  board-text.ts          every line the board stamps, with defaults
  blob.ts                Blob reads via the public CDN (quota notes inside)
  sources/spotify.ts     refresh-token flow
  notify.ts              visit emails via Resend
docs/
  v2-scope.md            what's being built next
```

## Run it

```
cp .env.example .env.local   # fill in what you need; the board runs with none of it
npm install
npm run dev
```

With no env vars the board renders from `BOARD_DEFAULTS`. Spotify, Blob, and emails each switch on when their vars are present.

## Board

The grid is a fixed 141 rows landscape, 153 portrait, and the dot size is fluid, so the composition is identical on every screen. Pages are hash routes (`/#work`, `/#about`), all composed inside `components/FlipdotBoard.tsx`. `prefers-reduced-motion` swaps the wipe for an instant cut.

Keys: `C` cycles cursor modes. Click the portrait.

## Status

Live. The next version keeps the board as the landing and moves work, writing, and about to HTML pages under a board masthead. See `ROADMAP.md` and `docs/v2-scope.md`.
