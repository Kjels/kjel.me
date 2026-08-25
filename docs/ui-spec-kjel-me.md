# kjel.me — UI Spec

A curated, living wall of the media Kjel consumes. A stranger lands here and, in one
glance, gets his taste. The artwork is the product; everything else is plumbing.

Stack target: Next.js 16 / React 19 / Tailwind v4. Dark, brutalist, Helvetica, mobile-first.
Strictly monochrome chrome — **the only color on the page is the media artwork.**

This spec is decisive. Build it as written.

---

## 0. What dies (do this first)

- `StatusBar.tsx` — delete the import and the entire on-air ticker block in `Feed.tsx`.
- `--tally: #ff3b2f` token — delete from `globals.css` and `@theme`.
- `live` state everywhere: the `Eq()` component in `Tile.tsx`, the `tally-dot` row, the
  `@keyframes tally-pulse` / `@keyframes eq` / `.tally-dot` / `.eq-bar` CSS, and the
  `live?: boolean` field in `types.ts`. The "● live" / equalizer concept is gone.
- The masonry CSS: `.feed { column-count … }` block. Replaced wholesale (§1).
- Per-tile metadata footer in `Tile.tsx` (§2).
- The word "Intake" and the broadcast vocabulary ("transmission", "signal",
  "channel" in copy, "on-air"). Wordmark is `kjel.me` (§5).

Keep: `DetailSheet` (restyled, §3), the typographic-cover fallback (re-tuned, §2),
`MEDIA` config, `ago()`, the source labels.

---

## 1. Grid system

### The decision
**Uniform square cells. Zero gap. Art cropped via `object-fit: cover`, centered.**

The tension: music is `1/1`, books/film `2/3`, video `16/9`. A "seamless wall" cannot
honor three native ratios and still be seamless — mixed ratios force either gaps
(masonry) or ragged edges (justified rows). Both read as "a layout," not "a wall."

A square cell is the only shape that:
- tiles perfectly into N columns with **no gaps and no orphaned row-ends**,
- is the friendliest crop for all four media (album art is already square; posters and
  book covers center-crop to a clean square that still reads as a poster; video thumbs
  lose letterbox edges but keep the subject).

We accept the crop. On a taste-wall the *grid of color* is the message; the full poster
is one tap away in the sheet (§3), shown there at its true ratio. This is the standard
move for cover-walls (Letterboxd's grid, Last.fm, Apple Music's library) and it's why
they read as a wall and not a feed.

Rejected: `grid-auto-flow: dense` with spanning tiles (creates a busy, "designed" mosaic
— the opposite of pure); justified rows (ragged right edge breaks the seamless feel).

### Implementation — CSS Grid, fixed columns, square cells
Replace the entire `.feed` block in `globals.css` with:

```css
/* seamless square tile wall */
.wall {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;                       /* truly seamless */
}
@media (min-width: 480px)  { .wall { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 768px)  { .wall { grid-template-columns: repeat(4, 1fr); } }
@media (min-width: 1100px) { .wall { grid-template-columns: repeat(5, 1fr); } }
@media (min-width: 1400px) { .wall { grid-template-columns: repeat(6, 1fr); } }
```

- **Mobile-first column counts: 2 → 3 → 4 → 5 → 6.** Two columns on a phone keeps each
  cover large enough to actually read the art (a 6-up phone grid would be thumbnails of
  thumbnails). Cover art has the visual density to carry 2-up.
- **`gap: 0`.** He said seamless; deliver seamless. No 1px line — a hairline grid is the
  "broadsheet" tic we're explicitly avoiding. Tiles butt edge-to-edge. Separation comes
  from the art itself; where two dark covers meet, that's fine — it reinforces the wall.
- Each cell is square via `aspect-ratio: 1` on the tile (§2), so rows are uniform and the
  bottom edge of the wall is always flush.
- Container: drop the `max-w-[1320px]` side padding to **edge-to-edge** on mobile
  (`px-0`), with a small `max-w-[1600px]` cap centered on very wide screens so cells don't
  become billboards. The wall bleeds to the viewport edges — part of what makes it feel
  like a wall, not a card.

Sort stays newest-first by `intakeAt` (already in `Feed.tsx`). New items appear top-left.

---

## 2. Tile at rest

A tile is **just the artwork, edge to edge, square.** No footer, no chip, no text at rest
when there's an image. Silence is the brutalist move.

### With a cover image
```
button.tile  (aspect-ratio:1; position:relative; overflow:hidden; background:var(--well))
  img        (absolute inset-0; h-full w-full; object-fit:cover; object-position:center)
```
- No border. Borders between tiles create the grid-line look we're killing. The art's own
  edges are the boundary.
- `loading="lazy"`, `alt=""` (decorative — title is announced via `aria-label`, below).

### Without a cover image (the fallback must NOT look broken)
The typographic cover is where taste shows even with no art. Re-tune it to be a
deliberate, composed object — not a placeholder.

```
div  (absolute inset-0; bg:var(--well); flex column; justify-between; p-3)
  — top: nothing (drop the giant faint glyph watermark; it read as "missing image")
  — bottom: title set tight and large
      span.title  font-display, font-bold,
                  text-[clamp(15px,4.2vw,22px)], leading-[1.05],
                  tracking-[-0.02em], text-fg, text-balance,
                  line-clamp-4
  — the medium glyph (§ below) sits bottom-right as the only adornment
```
- The fallback well uses `--well (#161619)` — one notch off the canvas, so a textless
  cover still reads as an intentional tile, not a hole. Because it's near-black, it
  recedes and lets the real artwork carry the color, exactly as required.
- Big title type *is* the design here. A book with no cover becomes a typographic cover —
  which is itself a taste signal (it looks like a brutalist book jacket). That's the point.

### Indicating medium without color
A single **monochrome glyph**, bottom-right, `12px`, `var(--fg2)`. Purely typographic — no
colored chips, no SVG icons. Final marks (distinct and legible at 12px):

| Medium | Glyph | Read |
|--------|-------|------|
| MUS | `♪` | note |
| FLM | `❖` | poster / frame |
| BK  | `❡` | pilcrow = text |
| YT  | `▶` | play |

The current `MEDIA[medium].glyph` set has FLM `▶` and YT `⏵` (both "play") — too close.
Use the table above instead.
Glyph appears **only on hover/focus and on the fallback cover** — at rest, an image tile
is pure art. (Showing the glyph on every image tile would clutter the wall; reveal it on
intent.)

### States (monochrome only)
- **Rest:** art at `filter: none`, full opacity. Fallback tiles show title + glyph.
- **Hover (pointer devices only — wrap in `@media (hover:hover)`):** a thin inset darken
  + the medium glyph fades in bottom-right.
  ```
  .tile:hover img { filter: brightness(0.82); }
  .tile:hover .glyph { opacity: 1; }
  ```
  The brightness dip is the *only* hover feedback — no scale, no lift, no shadow (those
  read as generic card UI). It says "interactive" in pure monochrome.
- **Glyph default:** `opacity: 0; transition: opacity 120ms ease;` → `1` on hover/focus.
- **Focus-visible:** `outline: 2px solid var(--fg); outline-offset: -2px;` (inset, so the
  ring stays inside the seamless cell and doesn't push neighbors). Already have a global
  `:focus-visible`; override offset to `-2px` for `.tile`.
- **Active/tap:** `.tile:active img { filter: brightness(0.7); }` — gives phones a press
  confirmation without JS.

### Accessibility
- The tile is a `<button>` (already is). Give it
  `aria-label={`${item.title} — ${item.subtitle}, ${cfg.label}`}` so screen readers get
  the full identity the visual hides.
- Touch target: cells are inherently ≥ 44px (half of a 375px phone = ~187px square). Fine.

---

## 3. Click-to-expand interaction

Mobile-first verdict: **bottom sheet on phones, right-side sheet on desktop.** The current
`DetailSheet` is already a right-side drawer — extend it to slide from the bottom under a
breakpoint. Bottom sheets are the native phone idiom (thumb-reachable, swipe-to-dismiss
mental model); a right drawer on a 375px screen feels like a desktop port.

### Layout
One component, responsive panel:
- **< 768px:** panel pinned to bottom, full width, `max-height: 88vh`, rounded top corners
  `rounded-t-2xl`? — no, brutalist: **square corners**, top hairline `border-t border-fg`.
  Slides up from `translateY(100%)`. Content scrolls inside.
- **≥ 768px:** panel pinned right, `max-w-[440px]`, full height, `border-l border-fg`.
  Slides in from `translateX(100%)`. (Current behavior — keep.)
- Scrim: `bg-fg/40` (a dim white veil over the dark page reads correctly here), tap to
  close. Already implemented.

### Contents (top to bottom)
1. **Hero artwork at true native ratio** (`aspectRatio: cfg.ratio`, `object-fit: cover`).
   This is where the full poster / 16:9 thumb finally shows uncropped-feeling — the payoff
   for the square crop on the wall. Fallback covers show the big-title treatment here too.
2. **Title** — `font-display font-extrabold text-[26px] tracking-[-0.025em] text-balance`.
3. **Creator** (`subtitle`) — `text-[14px] text-fg2`.
4. **Spec table** (`dl`) — keep the existing mono key/value rows. Rows:
   `Medium`, `Source`, `Added {ago}`, then any `item.meta`. Rename label "Logged" → "Added".
5. **Link out** — `Open on {SOURCE_LABEL} ↗`, full-width bordered button.
6. Header bar: replace `"{medium} · transmission"` with just the medium label, mono, e.g.
   `MUSIC`. Keep the `Close` button (44px tall touch target — bump `py` to `py-[10px]`).

### Transitions
```css
@keyframes sheet-up    { from { transform: translateY(100%); } to { transform: none; } }
@keyframes sheet-right { from { transform: translateX(100%); } to { transform: none; } }
@keyframes scrim-in    { from { opacity: 0; } to { opacity: 1; } }
```
- Scrim `120ms ease`. Panel `260ms cubic-bezier(0.2,0.7,0.2,1)`.
- Pick the keyframe by breakpoint (CSS media query on the panel class, or a `matchMedia`
  check). Prefer CSS: two classes, `.sheet-mobile` / `.sheet-desk`, gated by media query.
- **Close:** reverse. Since React unmounts on `null`, either keep the node mounted during
  an exit state, or accept instant close (acceptable for v1 — open animation carries the
  polish; document this as a known simplification).
- **`prefers-reduced-motion: reduce`:** no transform animation; the panel appears
  instantly, scrim still cross-fades (opacity is safe). Add to the existing reduced-motion
  block.
- Lock body scroll while open: `document.body.style.overflow = 'hidden'` in the existing
  `useEffect`, restore on cleanup.
- Keep Esc-to-close (already there).

---

## 4. Filtering

**Keep the channel filter — it's essential for a taste-wall** (a music head wants to see
only the records). But restyle from the bordered "tab rail" to something that doesn't
compete with the seamless wall.

### New treatment: inline text filter, no borders, no counts-as-chips
A single row directly under the masthead, mono, lowercase, space-separated. Active item is
full-white; inactive is `--fg3`. No underline tabs, no border-bottom rail (that's the
broadsheet rule we're avoiding), no colored state.

```
nav  (flex, gap-4, overflow-x-auto, no-scrollbar, py-3)
  button  mono text-[12px] tracking-[0.06em] lowercase
          active:  text-fg
          rest:    text-fg3 hover:text-fg2
          → label only: "all" "music" "film" "books" "video"
```
- **Drop the per-item counts** from the rail — they add clutter and a second type color.
  The total count lives in the masthead instead (§5). If a count is wanted, show only the
  *active* filter's count in the masthead, updating live.
- Active state is weight/brightness, not a box. On mobile this row scrolls horizontally if
  needed but five short words fit ~360px.
- 44px touch target: `py-3` gives ≥ 44px row height.

This keeps filtering present and obvious without drawing a single rule line on the page.

---

## 5. Masthead / header

Minimal. A stranger needs exactly two things: whose wall this is, and a one-line orientation.

```
header  (px [matches wall inset], pt-7 pb-3)
  h1  "kjel.me"
      font-display, font-extrabold,
      text-[clamp(28px,8vw,40px)], leading-[0.9], tracking-[-0.045em]
      → the "." rendered in text-fg3 (one shade down) so "kjel" reads as the name
        and ".me" reads as the domain — a quiet typographic detail, still monochrome.
  p  one line, mono, text-[11px] tracking-[0.04em], text-fg2, mt-2
      → e.g. "everything i'm listening to, watching, and reading — {N} things, live."
        ({N} = items.length; "live" here means auto-updating, no broadcast styling.)
```
- No status bar, no ticker, no time-of-day, no equalizer. The one-liner *is* the
  orientation.
- The wall starts immediately below the filter row. No hero image, no big empty space —
  brutalist density. The covers are the hero.
- Keep header text inside a `px` that matches the wall's mobile edge bleed: give the header
  `px-4` while the wall goes `px-0`, so type has breathing room but art bleeds. This
  intentional offset (text inset, art full-bleed) is itself a refined detail.

---

## 6. Type & tokens

### Palette — pure monochrome, no accent
Update `globals.css` `:root`. Remove `--tally`. Final tokens:

```css
:root {
  --surface: #0a0a0b;  /* canvas — a hair warmer-neutral than pure #000, less "void" */
  --well:    #161619;  /* fallback-cover wells / sheet raised */
  --raised:  #131316;  /* sheet surface */
  --fg:      #f2f2f0;  /* near-white (primary text, active state, focus ring) */
  --fg2:     #9a999f;  /* secondary text (creator, one-liner) */
  --fg3:     #5a595f;  /* tertiary (inactive filter, the ".me", glyph-at-rest) */
  --line:    #232327;  /* hairline — used ONLY in the sheet, never on the wall */
}
```
Contrast check (WCAG AA, normal text on `--surface`):
- `--fg` on `--surface`: ~17:1 — AAA.
- `--fg2` on `--surface`: ~6.0:1 — AA pass (use only ≥ 11px, which we do).
- `--fg3` on `--surface`: ~3.2:1 — used **only** for non-essential / large or
  decorative text (inactive filters which have a hover, the decorative ".me"). Never for
  body copy. Inactive filters are reinforced by the active one being bright, so this is
  acceptable; if stricter AA is wanted, bump `--fg3` to `#6b6a70` (~3.9:1).

### Type
- **Display: Helvetica Neue / Helvetica / Arial.** Confirmed — keep. It's the right
  brutalist neutral and it's free/system. All headings, titles, the wordmark.
- **Mono: IBM Plex Mono — KEEP, but restrict its job.** Recommendation: do **not** drop it.
  Mono reads generic only when it's everywhere. Confine it to *metadata and system text*:
  the one-liner, the filter row, the sheet's spec table, the "Added {ago}", source labels,
  the medium label in the sheet header. Everything *editorial* (titles, creator names, the
  wordmark) is Helvetica. This Helvetica-editorial / mono-metadata split is a deliberate
  system, not decoration — it earns the mono.

### Type scale (the only sizes on the page)
| Token | px / clamp | Font | Use |
|-------|-----------|------|-----|
| wordmark | clamp(28,8vw,40) | Helvetica 800 | `kjel.me` |
| sheet-title | 26 | Helvetica 800 | detail title |
| cover-title | clamp(15,4.2vw,22) | Helvetica 700 | fallback cover title |
| creator | 14 | Helvetica 400 | subtitle in sheet |
| meta | 11–12 | Mono | one-liner, filters, spec table |
| glyph | 12 | (font) | medium mark on tile |
| micro | 10 | Mono | sheet header label, key labels |

Tracking: tight negative on display (`-0.025em` to `-0.045em`); slight positive on mono
(`0.04em`–`0.08em`). Keep.

### Spacing
4px base. Wall `gap: 0`. Header `pt-7`. Filter `py-3`. Sheet padding `p-4`.
Sheet rows `py-[9px]`. No other spacing values needed — restraint is the aesthetic.

---

## 7. The signature

**"Saturation = recency."** The most recent row sits at full saturation; older rows are
progressively
desaturated (down to ~`saturate(0.55)` for the oldest visible). The newest things Kjel
loves are literally the most vivid on the wall; his back-catalog fades like memory. On
hover/tap any tile snaps to full color.

Why this is the signature:
- It's *about him* — it visualizes "what I'm into right now" without a single word, ticker,
  or accent color. It replaces the dead "on-air" concept with something honest and quiet.
- It's pure CSS (`filter: saturate()`), monochrome-compatible (it modulates the *art's*
  color, adds none of its own), and respects the "art is the only color" rule by treating
  color itself as the time axis.
- Trivial to build: compute a per-item `recencyIndex` (0 = newest) in `Feed.tsx`, map to a
  saturation value, set as a CSS custom property on each tile:
  `style={{ ['--sat']: satFor(i) }}` → `.tile img { filter: saturate(var(--sat,1)); }`.
  Hover/active override to `saturate(1)`.
- `prefers-reduced-motion` unaffected (no motion); but gate the *transition* so a
  reduced-motion user gets an instant snap on hover, not a fade.

Saturation ramp (example for the visible set, clamp so it never gets muddy):
`sat = clamp(1 - recencyIndex * 0.012, 0.55, 1)` — first ~5 tiles full, gently trailing off.

This is the thing a stranger screenshots. It's unmistakably one person's wall, and it
could not have been the default AI grid.

---

## Build order

1. **`globals.css`** — remove `--tally`, tally/eq keyframes, `.tally-dot`, `.eq-bar`,
   `.feed` masonry. Add `.wall` grid (§1), `.tile` hover/focus/saturation rules (§2, §7),
   sheet keyframes + reduced-motion + body-scroll handling hooks (§3), update `:root`
   palette (§6).
2. **`lib/types.ts`** — delete `live?: boolean`.
3. **`lib/media.ts`** — update glyphs to `MUS ♪ / FLM ❖ / BK ❡ / YT ▶` (§2); rename
   `SOURCE_LABEL` copy if needed (drop broadcast tone).
4. **`components/StatusBar.tsx`** — delete file.
5. **`components/Tile.tsx`** — strip `Eq`, footer, chip, `live`; square art-only tile with
   glyph-on-hover, retuned fallback cover, `aria-label`, saturation `--sat` prop (§2, §7).
6. **`components/Feed.tsx`** — remove StatusBar + masthead status block; new `kjel.me`
   masthead + one-liner (§5); inline text filter row (§4); `.wall` container (§1);
   compute `recencyIndex` and pass `--sat` to tiles (§7).
7. **`components/DetailSheet.tsx`** — responsive bottom-sheet (mobile) / right-drawer
   (desktop), restyled header copy, "Added" label, body-scroll lock, reduced-motion (§3).
8. **Wordmark/title** — update `app/layout.tsx` `<title>`/metadata and any "Intake" string
   to `kjel.me`.

Accessibility gate before done: focus-visible rings inset on tiles, 44px touch targets on
filter buttons and Close, AA contrast on all text ≥ body size, `prefers-reduced-motion`
honored on sheet + saturation transitions, `aria-label` on every tile, sheet
`role="dialog" aria-modal`.
