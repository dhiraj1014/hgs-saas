/**
 * Read-only sanity check: counts rows in every domain + auth table at DATABASE_URL.
 * Useful to verify a wipe took effect, or to spot-check a fresh DB.
 */
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const masked = url.replace(/:[^:@/]+@/, ":***@");
console.log(`Counting rows in: ${masked}\n`);

const client = postgres(url);
const tables = [
  "academic_year", "class", "section", "subject", "class_subject",
  "student", "parent", "parent_student", "teacher_assignment",
  "attendance", "announcement", "notification_log", "otp_attempt",
  '"user"', "session", "account", "verification",
];
try {
  for (const t of tables) {
    const rows = await client.unsafe(`SELECT COUNT(*)::int AS n FROM ${t}`);
    console.log(`  ${t.padEnd(20)} ${rows[0]?.n ?? "?"}`);
  }
} finally {
  await client.end();
}
