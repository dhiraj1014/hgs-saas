import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema/auth";
import { notifier } from "./notifier";

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
      phoneNumber: { type: "string", required: false },
      phoneNumberVerified: { type: "boolean", required: false, defaultValue: false },
      role: { type: "string", required: false, defaultValue: "parent" },
      isActive: { type: "boolean", required: false, defaultValue: true },
    },
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }) => {
        await notifier.sendParentOtp(phone, code, { type: "parent_otp", id: "00000000-0000-0000-0000-000000000000" });
      },
      otpLength: 6,
      expiresIn: 600,
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/\D/g, "")}@parent.local`,
        getTempName: () => "Parent",
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
