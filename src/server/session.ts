import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can, type Ability, type Role } from "@/lib/permissions";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

export async function requireAbility(ability: Ability) {
  const session = await requireSession();
  const role = session.user.role as Role;
  if (!can(role, ability)) {
    throw new Error(`Forbidden: role '${role}' lacks ability '${ability}'`);
  }
  return session;
}
