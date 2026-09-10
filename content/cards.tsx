import type { ReactNode } from "react";

// The glass cards: what the board says when a dot line is not enough.
// Plain sentences, mixed case, real type. One card per id. The first sentence carries the name.
export type Card = { lead: string; body: ReactNode };

export const CARDS: Record<string, Card> = {
  life: {
    lead: "Conway's Game of Life. A grid of cells, three rules, no player.",
    body: (
      <>
        <p>
          Each tick, every cell looks at its eight neighbours. A live cell with two or three live neighbours stays alive.
          A dead cell with exactly three comes alive. Everything else is dead. That is all of it, and it is enough for
          patterns that blink, glide, grow without end, or build other patterns. The green shape beside the word is a
          glider, the smallest thing that travels.
        </p>
        <p>Here the board is the grid. Paint some cells and press play. A row of three is a good first try.</p>
      </>
    ),
  },
};
