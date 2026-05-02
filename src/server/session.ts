import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can, type Ability, type Role } from "@/lib/permissions";

const getSessionCached = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireSession() {
  const session = await getSessionCached();
  if (!session) redirect("/login");
  return session;
}

export async function requireAbility(ability: Ability) {
  const session = await requireSession();
  const role = session.user.role as Role;
  if (!can(role, ability)) {
    redirect(`/dashboard?denied=${encodeURIComponent(ability)}`);
  }
  return session;
}

export async function requireParent() {
  const session = await requireSession();
  const role = (session.user as { role: string }).role;
  if (role !== "parent") {
    throw new Error("Parent role required");
  }
  return session;
}
