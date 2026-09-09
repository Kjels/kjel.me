// The projects, in the order they appear. This is the single source for
// everything the site knows that GitHub doesn't: what a thing is, why it
// exists, where it lives. The body of each page is the MDX file beside it;
// status and progress come from each repo's ROADMAP.md at request time.

export type Status = "live" | "building" | "prototype" | "parked";

/** the ledger speaks Life: a project's state as a lifeform's */
export const VERB: Record<Status, string> = { live: "MOVES", building: "GROWS", prototype: "OSC", parked: "STILL" };

export type Project = {
  slug: string;
  title: string;
  /** one line, what it is */
  blurb: string;
  status: Status;
  /** GitHub repo as owner/name; omitted when the source is private */
  repo?: string;
  site?: string;
  started: string; // YYYY-MM
  stack: string[];
  /** two or three short lines for the board. the long version lives in the repo's README */
  lines: string[];
  body: () => Promise<{ default: React.ComponentType }>;
};

export const PROJECTS: Project[] = [
  {
    slug: "kims",
    title: "KIMS",
    blurb: "A kitchen appliance with a scale in it. Weigh what you eat, keep the pantry live, cook from what you have.",
    status: "building",
    repo: "Kjels/kims",
    started: "2026-08",
    stack: ["Raspberry Pi 4", "HX711 load cell", "Python", "vanilla JS", "OpenSCAD"],
    lines: ["A SCALE WITH OPINIONS.", "PUT THE BOWL DOWN. TAP. DONE.", "THE PANTRY KEEPS ITSELF."],
    body: () => import("./kims.mdx"),
  },
  {
    slug: "kjel-me",
    title: "kjel.me",
    blurb: "This site. A simulated flip-dot sign in front, plain HTML behind it.",
    status: "live",
    repo: "Kjels/kjel.me",
    site: "https://kjel.me",
    started: "2026-08",
    stack: ["Next.js", "Canvas 2D", "Vercel"],
    lines: ["YOU ARE LOOKING AT IT.", "141 ROWS. NO PIXELS.", "THE CYCLIST IS NOT FOR SALE."],
    body: () => import("./kjel-me.mdx"),
  },
  {
    slug: "harness",
    title: "Harness",
    blurb: "A tmux workspace for Claude Code whose session transcripts follow you between machines.",
    status: "prototype",
    repo: "Kjels/harness",
    started: "2026-07",
    stack: ["Node", "tmux", "git"],
    lines: ["CLAUDE, IN A TMUX PANE.", "ONE SESSION, TWO MACHINES.", "GIT IS THE MEMORY."],
    body: () => import("./harness.mdx"),
  },
  {
    slug: "capture",
    title: "Capture",
    blurb: "Braindump in, todos out. An inbox that silently sorts text into todos, notes and reminders.",
    status: "building",
    repo: "Kjels/capture",
    started: "2026-05",
    stack: ["Next.js", "Supabase", "Claude", "Swift"],
    lines: ["BRAINDUMP IN. TODOS OUT.", "NO CHAT. NO QUESTIONS.", "NOTHING IS EVER DROPPED."],
    body: () => import("./capture.mdx"),
  },
  {
    slug: "sprint-orchestrator",
    title: "Sprint Orchestrator",
    blurb: "Run a sprint of AI agents from markdown files. Task graph, budgets, review gates, live dashboard.",
    status: "prototype",
    repo: "Kjels/sprint-orchestrator",
    started: "2026-04",
    stack: ["Python", "Claude Agent SDK", "FastAPI", "React"],
    lines: ["A SPRINT IS A FOLDER.", "AGENTS IN WAVES.", "A HUMAN AT THE GATES."],
    body: () => import("./sprint-orchestrator.mdx"),
  },
];

export const projectBySlug = (slug: string) => PROJECTS.find((p) => p.slug === slug);
