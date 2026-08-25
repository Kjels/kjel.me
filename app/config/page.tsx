import { isAdmin } from "@/lib/auth";
import { getBoardText } from "@/lib/board";
import { AdminLogin } from "@/components/AdminLogin";
import { ConfigEditor } from "@/components/ConfigEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "kjel.me / config", robots: { index: false } };

export default async function Config() {
  if (!(await isAdmin())) return <AdminLogin />;
  return <ConfigEditor initial={await getBoardText()} />;
}
