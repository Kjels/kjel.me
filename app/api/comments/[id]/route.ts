import { hideComment } from "@/lib/comments";
import { isAdmin } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return Response.json({ ok: false }, { status: 401 });
  const { id } = await params;
  await hideComment(id);
  return Response.json({ ok: true });
}
