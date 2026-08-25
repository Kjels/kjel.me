import { put, list } from "@vercel/blob";

/**
 * Append-only view tracking. Each visit writes a unique marker blob under
 * v/<day>/. Count = number of markers — no read-modify-write, so nothing is
 * lost to Blob's eventual consistency (the reason a plain counter undercounted).
 */
const token = () => process.env.BLOB_READ_WRITE_TOKEN;

export interface Views {
  total: number;
  days: Record<string, number>;
}

export async function bumpView(): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  await put(`v/${day}/m`, "1", {
    access: "public",
    token: token(),
    addRandomSuffix: true, // unique marker per visit — never collides
    contentType: "text/plain",
  });
}

export async function getViews(): Promise<Views> {
  const days: Record<string, number> = {};
  let total = 0;
  let cursor: string | undefined;
  do {
    const res = await list({ prefix: "v/", token: token(), cursor, limit: 1000 });
    for (const b of res.blobs) {
      total++;
      const day = b.pathname.split("/")[1];
      if (day) days[day] = (days[day] ?? 0) + 1;
    }
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  return { total, days };
}

