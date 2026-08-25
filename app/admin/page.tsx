import { isAdmin } from "@/lib/auth";
import { getMedia } from "@/lib/store";
import { getComments } from "@/lib/comments";
import { getViews } from "@/lib/views";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminPanel } from "@/components/AdminPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "kjel.me / admin", robots: { index: false } };

export default async function Admin() {
  if (!(await isAdmin())) return <AdminLogin />;
  const [media, comments, views] = await Promise.all([getMedia(), getComments(), getViews()]);
  return <AdminPanel initialMedia={media} initialComments={comments} views={views} />;
}
