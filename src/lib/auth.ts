import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema/auth";

// During `next build` (Next.js sets NEXT_PHASE), env vars may not be present
// when the module graph is evaluated. Fall back to a placeholder so build
// succeeds; throw at runtime if the secret is genuinely missing.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret && !isBuildPhase) {
  throw new Error("BETTER_AUTH_SECRET not set");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  secret: secret ?? "build-placeholder-not-used-at-runtime",
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      role: { type: "string", required: true },
      isActive: { type: "boolean", required: false, defaultValue: true },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
