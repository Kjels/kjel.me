// Every line of copy the landing stamps, editable at /config.
// Client-safe: pure data, no server imports. The board's 5x7 face covers
// A-Z 0-9 . , ' - & ! ? / : and anything else stamps as "?".
export type BoardText = {
  home: string[]; // wide-board intro paragraphs
  homeNarrow: string[]; // phone intro paragraphs
  roles: string[]; // the rotating role ladder, in order
};

export const BOARD_DEFAULTS: BoardText = {
  home: [
    "A PERSONAL SITE, STILL IN PROGRESS.",
    "PART DESIGN EXPERIMENT, PART SHELF FOR PROJECTS AND FIXATIONS.",
  ],
  homeNarrow: ["A PERSONAL SITE, IN PROGRESS."],
  roles: ["TINKERER", "BUILDER", "AMATEUR", "FRIEND", "BROTHER", "LOVER", "ENEMY"],
};
