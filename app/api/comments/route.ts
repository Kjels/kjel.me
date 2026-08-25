import { addComment, getComments } from "@/lib/comments";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getComments());
}

export async function POST(req: Request) {
  const data = await req.json().catch(() => null);
  if (!data || typeof data.body !== "string" || !data.body.trim()) {
    return Response.json({ ok: false, error: "Message required" }, { status: 400 });
  }
  if (data.website) return Response.json({ ok: true }); // honeypot — silently drop bots
  if (data.body.length > 2000) {
    return Response.json({ ok: false, error: "Too long" }, { status: 400 });
  }
  const comment = await addComment({
    body: data.body,
    name: data.name,
    parentId: data.parentId ?? null,
    isAdmin: await isAdmin(),
  });
  return Response.json({ ok: true, comment });
}
