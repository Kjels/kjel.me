// Every line of copy the flip-dot board stamps, editable at /config.
// Client-safe: pure data, no server imports. The board's 5x7 face covers
// A-Z 0-9 . , ' - & ! ? / : — anything else stamps as "?".
export type BoardText = {
  home: string[]; // wide-board intro paragraphs
  homeNarrow: string[]; // phone intro paragraphs
  pages: Record<string, string[]>; // WORK / NOW / NOTES body lines ("" = gap)
  about: string[]; // wide bio ("" = gap)
  aboutNarrow: string[]; // phone bio, pre-broken lines
  place: string;
  placeNarrow: string;
  roles: string[]; // the rotating role ladder, in order
  linkedin: string;
  email: string; // mailto: href
};

export const BOARD_DEFAULTS: BoardText = {
  home: [
    "A PERSONAL SITE, STILL IN PROGRESS.",
    "PART DESIGN EXPERIMENT, PART SHELF FOR PROJECTS AND FIXATIONS.",
  ],
  homeNarrow: ["A PERSONAL SITE, IN PROGRESS."],
  pages: {
    WORK: [
      "KEPT: RECORD THE PEOPLE YOU LOVE.",
      "",
      "CAPTURE: AN INBOX THAT SORTS ITSELF.",
      "",
      "RISE & FALL: A BOARD GAME IN THE BROWSER.",
    ],
    NOW: [
      "TINKERING WITH THIS SITE.",
      "",
      "ALSO MAKING A KITCHEN INVENTORY MANAGEMENT SYSTEM.",
    ],
    NOTES: ["NOTHING HERE YET."],
  },
  about: [
    "I BUILD SMALL SOFTWARE. GAMES, TOOLS, THIS SITE.",
    "",
    "ROWER TURNED RUNNER. FIXED GEAR. BOARD GAMES.",
  ],
  aboutNarrow: ["I'M 27.", "", "I LIKE", "WORKING ON", "ANYTHING AND", "EVERYTHING."],
  place: "BROOKLYN, NY",
  placeNarrow: "BKLYN, NY",
  roles: ["TINKERER", "BUILDER", "AMATEUR", "FRIEND", "BROTHER", "LOVER", "ENEMY"],
  linkedin: "https://www.linkedin.com/in/",
  email: "mailto:hello@kjel.me",
};

