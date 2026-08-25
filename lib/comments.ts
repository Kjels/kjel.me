import type { Comment } from "./types";
import { readJson, writeJson } from "./blob";

const KEY = "comments.json";

export async function getComments(): Promise<Comment[]> {
  return readJson<Comment[]>(KEY, []);
}

export async function addComment(input: {
  body: string;
  name?: string | null;
  parentId?: string | null;
  isAdmin?: boolean;
}): Promise<Comment> {
  const comments = await getComments();
  const name = (input.name ?? "").trim();
  const comment: Comment = {
    id: `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    parentId: input.parentId ?? null,
    name: input.isAdmin ? "Kjel" : name || null,
    body: input.body.trim().slice(0, 2000),
    isAdmin: Boolean(input.isAdmin),
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  await writeJson(KEY, comments);
  return comment;
}

/** Soft-delete (keeps thread structure intact). */
export async function hideComment(id: string): Promise<void> {
  const comments = await getComments();
  await writeJson(
    KEY,
    comments.map((c) => (c.id === id ? { ...c, hidden: true, body: "", name: null } : c))
  );
}
