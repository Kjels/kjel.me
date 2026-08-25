# kjel.me — Site Vision

The media wall grew up. kjel.me becomes a full personal site — a professional surface
with a personal soul — and the wall becomes one room in it, not the whole house.

**Who it's for:** a stranger who might work with Kjel — a founder, a client, a hiring
manager, a collaborator. They should leave knowing three things in under a minute:
who he is, what he's building, and that he has taste. The site never *sells*; the work
and the taste do the selling.

**Voice:** unchanged. Dark, monochrome, brutalist, Helvetica-editorial / mono-metadata.
The rule extends site-wide: **chrome is monochrome; only content carries color.** On
`/media` the content is cover art. On `/work` it's project screenshots. Everywhere
else the site is nearly colorless — which makes the colorful rooms land harder.

This doc is the map. The existing `ui-spec-kjel-me.md` remains the law for the wall
itself; nothing in this vision changes the wall's design.

---

## 1. Information architecture

```
/          front door — identity + live signals + doors into the site
/media     the wall (today's homepage, moved intact: filters, sheet, flips, guestbook)
/work      what he's building — curated project entries
/now       present tense — current focus, reading, playing, listening
/about     who he is + how to reach him
/notes     writing — stub in v1, real index when there's something to say
```

- Every page shares one **site masthead**: the `kjel.me` wordmark (smaller than the
  wall's hero treatment — `clamp(20px, 4vw, 26px)`) plus a mono lowercase nav row in
  exactly the channel-filter style: active `--fg`, rest `--fg3 hover:--fg2`, no
  underlines, no borders. `media work now about notes`.
- `/media` keeps its own second row — the channel filter — under the shared masthead.
  Its oversized wordmark hero moves to `/` (the landing inherits the big type).
- The guestbook stays with the wall. It's a comment on the taste, not on the resume.

## 2. The front door (`/`)

A dense, almost entirely typographic page. One viewport on desktop, minimal scroll on
mobile. Top to bottom:

1. **Wordmark** — the big `kjel.me` treatment from today's wall masthead
   (`clamp(34px,11vw,56px)`, the `.me` in `--fg3`).
2. **Identity line** — Helvetica, one sentence, plain: what he does and builds.
   Written for the professional reader, worn lightly. (Draft, Kjel to edit:
   *"I build AI-native product — outbound engines, consumer apps, tools for
   myself — and I ship fast."*)
3. **Live signals** — the existing `NowItem` block, verbatim: `✦ now listening — …`.
   This is the site's heartbeat and its proof of life; it already works.
4. **Doors** — four short rows, mono metadata on the left, Helvetica payload right:
   ```
   work    Kept — record the stories of people you love        →
   media   417 things I've listened to, watched, read          →
   now     current focus + what's in rotation                  →
   about   who I am, how to reach me                           →
   ```
   Each row's payload is *live* (latest project, item count) so the door itself
   demonstrates the site is alive.
5. **Contact line** — one mono row at the bottom: email · GitHub · LinkedIn. No form.

No hero image. No color above the fold except the ✦ and whatever the live signal
brings. The landing is the monochrome antechamber; `/media` is the color payoff.

## 3. `/work`

Curated, not exhaustive — 3–6 entries Kjel is proud to be judged by. Data lives as a
typed array (`lib/work.ts`), same pattern as `MEDIA`:

```ts
interface WorkItem {
  slug: string;
  name: string;          // "Kept"
  oneliner: string;      // "Gift-based life-story recording for families"
  status: "live" | "building" | "parked";
  year: string;          // "2026"
  url?: string;          // live product link
  body: string;          // 2–4 sentences: what it is, why, what it proves
  image?: string;        // one screenshot — the only color on the page
}
```

- Index page only in v1 (no per-project subpages) — entries stacked, generous type,
  screenshot right/below. Status rendered as mono metadata (`live` / `building` /
  `parked`), never as a colored badge.
- Candidate entries: **Kept**, **Capture**, **Rise & Fall digital**, **this site
  itself** (the wall is a legitimate portfolio piece), **Decker** if shareable.
  Day-job work (Quiver/Beau) is hackajob IP — reference it in `/about` as experience
  ("I design and build the outbound engine at hackajob"), don't case-study it here.

## 4. `/now`

The nownownow.com idea, mostly assembled from data the app already has:

1. **Focus** — one hand-written paragraph: what he's actually working on this month.
   Stored where admin can edit it (extend the existing admin panel / store).
2. **In rotation** — items flagged `current: true` plus live Spotify/Steam signals,
   rendered as a single-row strip of tiles (reusing `Tile`, fixed height, no wall).
3. **Updated** — mono timestamp. An honest `/now` page that says *updated 3 weeks
   ago* is fine; a stale one with no date is not.

## 5. `/about`

Short. A portrait is optional and would be the page's only image. Three beats:
who he is (2–3 sentences, first person, plain), what he's done (compressed — current
role, what he builds on the side), how to reach him (email, GitHub, LinkedIn — the
same mono contact row as the landing). No skills grid, no timeline, no testimonials.

## 6. `/notes`

v1 is a stub with intent: the nav link exists, the page renders an index of zero
posts with a one-liner ("nothing published yet"). Structure it as MDX files in
`content/notes/` from day one so publishing later is dropping a file, not a build
project. Writing is the highest-leverage professional-surface feature this site can
grow — the IA should reserve the room now.

## 7. What does NOT change

- The wall: design, interactions, saturation signature, flips, guestbook, admin,
  seed/data pipeline — untouched, just re-homed at `/media`.
- The stack: Next.js 16 / React 19 / Tailwind v4 / Vercel Blob. No new dependencies
  except (later) MDX for notes.
- The Vercel project (`intake`) and repo location (`~/intake`). Renaming the folder
  to `~/kjel.me` is cosmetic and optional; do it never or last.

## 8. Build order (incremental — one phase, test, confirm, next)

1. **Re-home the wall.** Move today's homepage to `/media`; add the shared masthead
   component with nav; wall page swaps its hero masthead for the shared one +
   channel filter. `/` temporarily redirects to `/media` so nothing breaks.
2. **Landing page.** Build `/` per §2 (identity line drafted, Kjel edits copy).
   Remove the redirect. This is the moment the site becomes "a personal site."
3. **`/about` + contact.** Smallest page, biggest professional gap — do it early.
4. **`/work`.** `lib/work.ts` + index page; gather one screenshot per project.
5. **`/now`.** Focus text in store + admin edit; in-rotation strip.
6. **`/notes` stub**, metadata/OG pass (per-page titles, description, OG image),
   and confirm the `kjel.me` domain is attached to the Vercel project.

Each phase ships independently. After phase 2 the site is already coherent; 3–6 are
additive.
