import type { ReactNode } from "react";

// The glass cards: what the board says when a dot line is not enough.
// Natural language, mixed case, real type. One card per id.
export type Card = { label: string; title: string; body: ReactNode; foot?: string };

export const CARDS: Record<string, Card> = {
  life: {
    label: "Game of Life",
    title: "A zero-player game from 1970.",
    body: (
      <>
        <p>
          John Conway worked it out on a Go board. Every cell on the grid is alive or dead, and each tick the whole grid
          updates at once by three rules: a live cell with two or three live neighbours survives, a dead cell with exactly
          three is born, and everything else dies or stays dead.
        </p>
        <p>
          That is the entire game. There is no player and no goal, but the rules are enough for patterns that blink, glide,
          grow forever, or build other patterns. The green shape lapping beside the word is a glider: five cells that
          reassemble themselves one step diagonally every four ticks.
        </p>
        <p>
          Here the board is the grid. Paint some cells, press play, see what happens. Good first tries: a row of three, a
          two-by-two block, or a copy of the glider.
        </p>
      </>
    ),
    foot: "B3/S23",
  },
};
