import { readJson, writeJson } from "./blob";
import { BOARD_DEFAULTS, type BoardText } from "./board-text";

const PATH = "board.json";

export async function getBoardText(): Promise<BoardText> {
  const saved = await readJson<Partial<BoardText>>(PATH, {});
  return {
    ...BOARD_DEFAULTS,
    ...saved,
    pages: { ...BOARD_DEFAULTS.pages, ...(saved.pages ?? {}) },
  };
}

export async function saveBoardText(text: BoardText): Promise<void> {
  await writeJson(PATH, text);
}
