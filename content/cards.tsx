import type { ReactNode } from "react";

// The glass cards: what the board says when a dot line is not enough. The title is set in the
// sign's face; the body is plain sentences. A rule shows the cell and its eight neighbours as
// dots, live ones green as on the board, the cell under judgement ringed, then what becomes of it.
export type Rule = { before: number[]; after: 0 | 1; text: string; outcome: string };
export type Card = { title: string; intro: ReactNode; rules?: Rule[]; after?: ReactNode };

export const CARDS: Record<string, Card> = {
  life: {
    title: "GAME OF LIFE",
    intro: (
      <p>
        A cellular automaton devised by John Conway in 1970. Every cell on the grid is either alive or dead. The grid
        advances in steps, and at each step every cell is updated at once according to how many of its eight
        neighbours are alive.
      </p>
    ),
    rules: [
      { before: [0, 1, 0, 0, 1, 0, 0, 0, 0], after: 0, text: "A live cell with fewer than two live neighbours", outcome: "dies" },
      { before: [0, 1, 0, 0, 1, 1, 0, 0, 0], after: 1, text: "A live cell with two or three live neighbours", outcome: "survives" },
      { before: [1, 1, 0, 1, 1, 1, 0, 0, 0], after: 0, text: "A live cell with more than three live neighbours", outcome: "dies" },
      { before: [1, 0, 1, 0, 0, 0, 0, 1, 0], after: 1, text: "A dead cell with exactly three live neighbours", outcome: "becomes alive" },
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
