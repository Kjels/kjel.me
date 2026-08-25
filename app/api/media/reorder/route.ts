import { reorderMedia } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ ok: false }, { status: 401 });
  const { id, toIndex } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || typeof toIndex !== "number") {
    return Response.json({ ok: false }, { status: 400 });
  }
  const items = await reorderMedia(id, toIndex);
  return Response.json({ ok: true, items });
}
