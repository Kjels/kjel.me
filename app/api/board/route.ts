import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getBoardText, saveBoardText } from "@/lib/board";
import { BOARD_DEFAULTS, type BoardText } from "@/lib/board-text";

export async function GET() {
  return NextResponse.json(await getBoardText());
}

const lines = (v: unknown, fb: string[]) =>
  Array.isArray(v)
    ? v.slice(0, 40).map((l) => (typeof l === "string" ? l.slice(0, 200) : ""))
    : fb;

export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json()) as Partial<BoardText>;
  const d = BOARD_DEFAULTS;
  const clean: BoardText = {
    home: lines(b.home, d.home),
    homeNarrow: lines(b.homeNarrow, d.homeNarrow),
    roles: lines(b.roles, d.roles).filter(Boolean),
  };
  if (!clean.roles.length) clean.roles = d.roles;
  await saveBoardText(clean);
  revalidatePath("/"); // the landing re-renders with the new text right away
  return NextResponse.json(clean);
}
