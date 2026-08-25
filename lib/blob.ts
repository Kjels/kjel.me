import { put } from "@vercel/blob";
import { revalidateTag } from "next/cache";

/**
 * Tiny JSON store on Vercel Blob. Two files: media.json, comments.json.
 *
 * Reads hit the public CDN URL directly and never call list(). list() is a Blob
 * "advanced operation" and the Hobby allowance is 2,000/month — one list per
 * read burned it in roughly 660 page views, which is what suspended this store
 * in July. A tagged fetch makes the common page load cost nothing at all.
 *
 * Writes invalidate the tag, so admin edits surface without the old
 * cache-busting query string (which guaranteed a cache MISS every time).
 */
const token = () => process.env.BLOB_READ_WRITE_TOKEN;

/** Public base URL of the store, derived from the store id inside the token. */
function base(): string {
  const explicit = process.env.BLOB_PUBLIC_BASE;
  if (explicit) return explicit.replace(/\/+$/, "");
  const id = (token() ?? "").split("_")[3]; // vercel_blob_rw_<storeId>_<secret>
  if (!id) throw new Error("BLOB_READ_WRITE_TOKEN missing or malformed");
  return `https://${id.toLowerCase()}.public.blob.vercel-storage.com`;
}

export async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${base()}/${pathname}`, {
      // Long window because writes invalidate the tag; nothing mutates this
      // store from outside the app, so there's nothing else to go stale for.
      next: { revalidate: 3600, tags: [pathname] },
    });
    if (!res.ok) return fallback; // 404 = never written yet
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(pathname: string, data: unknown): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    token: token(),
    allowOverwrite: true,
    addRandomSuffix: false,
    cacheControlMaxAge: 0, // don't let the edge cache our mutable JSON
  });
  revalidateTag(pathname, "max"); // edits show on the next visit, no buster needed
}
