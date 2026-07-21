import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();
  return session?.user ?? null;
}
