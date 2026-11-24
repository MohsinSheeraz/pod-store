import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** For admin pages: sends visitors to log in, and non-admins home. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");
  return session;
}
