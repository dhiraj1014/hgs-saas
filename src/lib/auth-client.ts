import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [phoneNumberClient()],
});

export const { signIn, signOut, signUp, useSession, phoneNumber } = authClient;
