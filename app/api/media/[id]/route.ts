import { deleteMedia, updateMedia } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return Response.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const patch = await req.json().catch(() => ({}));
  delete patch.id;
  const items = await updateMedia(id, patch);
  return Response.json({ ok: true, items });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return Response.json({ ok: false }, { status: 401 });
  const { id } = await params;
  await deleteMedia(id);
  return Response.json({ ok: true });
}
