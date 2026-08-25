import { setCurrent } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ ok: false }, { status: 401 });
  const { id, current } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return Response.json({ ok: false }, { status: 400 });
  const items = await setCurrent(id, Boolean(current));
  return Response.json({ ok: true, items });
}
