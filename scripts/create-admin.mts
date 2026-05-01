// Force IPv4 DNS resolution: Neon's IPv6 path is unreachable from some Windows
// networks (Node.js defaults to IPv6 first). Setting this in-script is more
// reliable than NODE_OPTIONS=--dns-result-order=ipv4first which is easy to drop.
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { auth } from "../src/lib/auth";

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] ?? "Director";

if (!email || !password) {
  console.error("Usage: pnpm create-admin <email> <password> [name]");
  process.exit(1);
}

const result = await auth.api.signUpEmail({
  body: {
    email,
    password,
    name,
    role: "super_admin",
  },
});

if ("error" in result && result.error) {
  console.error("Failed:", result.error);
  process.exit(1);
}
console.log("Created super_admin:", email);
