import { addMedia, getMedia } from "@/lib/store";
import { resolveCover } from "@/lib/resolve";
import { isAdmin } from "@/lib/auth";
import type { MediaItem, Medium } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return Response.json({ ok: false }, { status: 401 });
  return Response.json(await getMedia());
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ ok: false }, { status: 401 });
  const d = await req.json().catch(() => null);
  if (!d?.title || !d?.medium) {
    return Response.json({ ok: false, error: "Title and medium required" }, { status: 400 });
  }
  const medium = d.medium as Medium;

  // auto-resolve cover/subtitle/aspect unless an explicit image is supplied
  let resolved: Awaited<ReturnType<typeof resolveCover>> = null;
  if (!d.image && (medium === "FLM" || medium === "BK")) {
    resolved = await resolveCover(medium, { title: d.title, author: d.author, year: d.year });
  }

  const slug = d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const item: MediaItem = {
    id: `${medium.toLowerCase()}:${slug}:${Date.now().toString(36)}`,
    medium,
    source: "manual",
    title: d.title,
    subtitle: d.subtitle || resolved?.subtitle || "",
    image: d.image || resolved?.image || null,
    aspect: d.aspect || resolved?.aspect,
    url: d.url || null,
    intakeAt: new Date().toISOString(),
    notes: d.notes || undefined,
    meta: resolved?.meta && Object.keys(resolved.meta).length ? resolved.meta : undefined,
  };
  const items = await addMedia(item);
  return Response.json({ ok: true, item, count: items.length });
}
