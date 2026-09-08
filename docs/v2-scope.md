# kjel.me v2 — scope

Date: 2026-09-08. Supersedes `site-vision-kjel-me.md` and `ui-spec-kjel-me.md`, which describe the deprecated media wall and should be deleted.

## The site in one line

A flip-dot sign as the front door, three HTML sections behind it: Work, Writing, About.

## Information architecture

| Route | Layer | Content |
|---|---|---|
| `/` | Board, full viewport | Landing. Intro, live strip, three nav tiles, the playful stuff |
| `/work` | HTML + board masthead | Project index. Card per project: blurb, status, roadmap progress, links |
| `/work/[slug]` | HTML + masthead | Project page. Long-form showcase (KIMS first). Photos, diagrams, why, what's next |
| `/writing` | HTML + masthead | Post index |
| `/writing/[slug]` | HTML + masthead | Post |
| `/about` | HTML + masthead | Bio, contact, what I'm into. One line for the day job, no case studies |
| `/config` | Existing | Board copy editor |

Removed from nav: BOOKS, NOW, NOTES.
- NOW folds into the landing's live strip.
- NOTES becomes Writing.
- BOOKS is removed entirely. Board pages, admin editor, media store, and seed deleted in phase 0.

## Two layers, one language

**Board layer.** Canvas flip-dot renderer, unchanged in look. Two modes:
- `full`: the landing. Current 141/153 rows.
- `strip`: 8–10 rows, fixed to the top of every HTML page. Carries the KJEL mark, clock, Spotify line, and the three nav words in the micro font. Live, hoverable, clickable.

**Content layer.** Server-rendered HTML in the language of the KJEL identity system (the handoff in ~/Downloads/design_handoff_kjel_identity): ink sheets with 1.5px hairlines, title blocks, registration ticks, tracked-caps Helvetica labels, no second typeface, no radius, no shadows. `/work` is a ledger sheet of cells; each project has a pictogram of standalone lit dots (`components/board/pictos.ts`, rendered by the engine with `grid: false`) that is the mechanism of the thing, slow at rest and full speed on hover. Status speaks Life: MOVES / GROWS / OSC / STILL. Progress is the R-03 tick rule; the commit count is GEN. `/about` is the 4E shipping label. Adding a project = one manifest entry, one MDX body, one pictogram function.

**Transition.** Board → content page uses the existing dithered column sweep. The dots cool to the off state as the HTML fades up beneath the canvas, then the canvas shrinks to the strip. Content page → board reverses it. Reduced motion: instant swap.

## Content source

Git is the CMS. Board copy stays in Blob via `/config` because it's short and gets tweaked live. Everything else lives in the repo:

```
content/
  work/
    kims.mdx          # frontmatter: title, blurb, repo, status, started, tags, cover
    harness.mdx
    capture.mdx
    ...
  writing/
    2026-09-first-post.mdx
```

Project pages pull two things from GitHub at request time, revalidated hourly:
- `ROADMAP.md`: status line → blurb fallback, checkbox ratio → progress, `## Why` → purpose.
- Repo metadata: last push, language, stars.

The MDX file holds what GitHub can't: photos, the narrative, the showcase. If a project has no MDX, the index still lists it from ROADMAP.md alone.

## Landing: richer and more playful

The landing is the only board page, so it gets the budget. Existing: portrait with laser eyes, cyclist, glider, cursor trail modes, rotating role ladder. Candidates for v2, pick 3–4:

- **Live strip.** Time, Spotify, currently reading, last push across public repos ("KIMS · 2H AGO"). Ties the site to the public ledger
- **Wave on arrival.** `kjel-board-wave.jpg` is already in the repo. Portrait waves once on load, then settles
- **Draw mode.** Drag to flip dots. Ephemeral, wiped on next transition. Touch works on phones
- **Nav tiles that react.** The three section words as large stamped blocks. Hover previews: WORK shows a progress bar of the top project, WRITING the latest post title, ABOUT the place and time
- **Idle behaviour.** After 20s idle the glider or a second cyclist takes over; input wakes it
- **Weather.** Brooklyn conditions as a pictogram next to the clock, cached per hour
- **Sound off by default, no autoplay.** A single click-to-enable flip click. Optional, easy to cut

## Deletions

Done in phase 0: media wall remnants, guestbook, books (board pages, `/admin`, `/api/media`, store, seed, resolve scripts), Steam, the two wall docs, create-next-app SVGs, dead CSS.

## Phases

**0. Clear the ground.** Done 2026-09-08. Deletions above plus the whole books feature. README, LICENSE, `.env.example`, metadata.

**1. Board becomes a component.** Done 2026-09-08. `components/board/{font,palette,raster,portrait,engine}.ts` + `scenes/kjel.ts`. `BoardShell` in the root layout owns full/strip mode and the transition.

**2. Content layer.** Done 2026-09-08. `@next/mdx`, `content/work/index.ts` manifest + one MDX per project, `content/about.mdx`, `lib/github.ts` (roadmap + repo metadata, hourly, `GITHUB_TOKEN` optional), `DotBar` progress. `/writing` not routed yet.

**3. Landing.** Live strip. Nav tiles. Three or four of the playful candidates. Wave on arrival.

**4. Polish.** OG image per page (board-rendered for `/`, typographic for the rest). `sitemap`, `robots.txt`. `/config` trimmed to the fields that still exist. Visit emails keep working, skip `/admin` and `/config` as today.

Suggested order of effort: 0 is an afternoon. 1 is the risky one and unblocks everything. 2 is the bulk. 3 is the fun. 4 is a day.

## Out of scope for v2

- WebGPU renderer (vgpu). Revisit after the module split, as an experiment behind a flag
- Books, in any form
- Comments or any visitor writes
- CMS UI for content. Edit MDX, push, done
- Higher board density. Reverted Sept 2026 on look, not perf

## Open decisions

Resolved 2026-09-08: books removed entirely. Writing hidden until the first post. One day-job sentence on About. Landing gets live strip, reactive nav tiles, idle behaviour, and the sweep animations. Repo publishes as `kjel.me`.
