import type { ReactNode } from "react";

// The glass cards: what the board says when a dot line is not enough.
// Plain sentences, mixed case, real type. One card per id.
export type Card = {
  title: string;
  intro: ReactNode;
  /** rows of a rule table: [state, condition, outcome] */
  rules?: [string, string, string][];
  after?: ReactNode;
};

export const CARDS: Record<string, Card> = {
  life: {
    title: "Conway's Game of Life",
    intro: (
      <p>
        A cellular automaton devised by John Conway in 1970. Every cell on the grid is either alive or dead. The grid
        advances in steps, and at each step every cell is updated at once, according to how many of its eight
        neighbouring cells are alive.
      </p>
    ),
    rules: [
      ["Live cell", "fewer than 2 live neighbours", "dies"],
      ["Live cell", "2 or 3 live neighbours", "survives"],
      ["Live cell", "more than 3 live neighbours", "dies"],
      ["Dead cell", "exactly 3 live neighbours", "becomes alive"],
    ],
    after: (
      <p>
        Here the board is the grid and its edges wrap around. Click a cell to flip it, drag to paint several, then
        Play. Pause to edit, Clear to start over. The green shape beside the word on the home screen is a glider, a
        five-cell pattern that moves one cell diagonally every four steps.
      </p>
    ),
  },
};
