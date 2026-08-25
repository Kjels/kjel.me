import { bumpView, countToday } from "@/lib/views";
import { notifyVisit } from "@/lib/notify";

export async function POST(request: Request) {
  const { path = "/", referrer = null } = await request
    .json()
    .catch(() => ({}) as { path?: string; referrer?: string | null });

  // The email is the point; the counter is bookkeeping. A dead Blob store must
  // not swallow the notification, so count failures are logged and shrugged off.
  let count: number | null = null;
  try {
    await bumpView();
    count = await countToday();
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
    countToday: count,
  });

  return Response.json({ ok: true, counted: count !== null });
}
