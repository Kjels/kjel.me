import { cookies } from "next/headers";

export const ADMIN_COOKIE = "intake_admin";

/** Light gate — a shared password in an httpOnly cookie. */
export async function isAdmin(): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === pw;
}
