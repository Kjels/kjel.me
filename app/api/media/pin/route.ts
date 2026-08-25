import { pinMedia } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ ok: false }, { status: 401 });
  const { id, pinned } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return Response.json({ ok: false }, { status: 400 });
  const items = await pinMedia(id, Boolean(pinned));
  return Response.json({ ok: true, items });
}
