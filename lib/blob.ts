import { put, list } from "@vercel/blob";

/**
 * Tiny JSON store on Vercel Blob. Two files: media.json, comments.json.
 * Public read, token-gated writes. Blobs are written with no edge cache and
 * read with a cache-buster so admin edits / new comments reflect immediately
 * (public Blob URLs are otherwise CDN-cached for a year).
 */
const token = () => process.env.BLOB_READ_WRITE_TOKEN;

export async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  try {
    const { blobs } = await list({ prefix: pathname, token: token() });
    const blob = blobs.find((b) => b.pathname === pathname);
    if (!blob) return fallback;
    const res = await fetch(`${blob.url}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return fallback;
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
}
