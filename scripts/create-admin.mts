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
