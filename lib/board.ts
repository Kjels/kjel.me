import { readJson, writeJson } from "./blob";
import { BOARD_DEFAULTS, type BoardText } from "./board-text";

const PATH = "board.json";

// saved copy wins per field; anything the board no longer reads is ignored
export async function getBoardText(): Promise<BoardText> {
  const saved = await readJson<Partial<BoardText>>(PATH, {});
  const pick = (k: keyof BoardText) => (Array.isArray(saved[k]) && saved[k]!.length ? saved[k]! : BOARD_DEFAULTS[k]);
  return { home: pick("home"), homeNarrow: pick("homeNarrow"), roles: pick("roles") };
}

export async function saveBoardText(text: BoardText): Promise<void> {
  await writeJson(PATH, text);
}
