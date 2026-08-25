import { bumpView } from "@/lib/views";
import { notifyVisit } from "@/lib/notify";

export async function POST(request: Request) {
  const { path = "/", referrer = null } = await request
    .json()
    .catch(() => ({}) as { path?: string; referrer?: string | null });

  // The email is the point; the marker is bookkeeping. A blocked store must not
  // swallow the notification, so a failed write is logged and shrugged off.
  try {
    await bumpView();
  } catch (err) {
    console.error("[view] blob unavailable", err);
  }

  const h = request.headers;
  const city = h.get("x-vercel-ip-city");
  await notifyVisit({
    path,
    referrer,
    city: city ? decodeURIComponent(city) : null,
    country: h.get("x-vercel-ip-country"),
    ua: h.get("user-agent"),
  });

  return Response.json({ ok: true });
}
