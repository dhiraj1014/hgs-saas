/**
 * Truncates every domain and auth table in the database pointed at by DATABASE_URL.
 * Schema and migration history are preserved — only row data is removed.
 *
 * Usage:
 *   pnpm tsx scripts/wipe-all-data.mts --yes-wipe
 *
 * Refuses to run without --yes-wipe to prevent accidents.
 */
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import postgres from "postgres";

if (!process.argv.includes("--yes-wipe")) {
  console.error("Refusing to wipe without --yes-wipe flag.");
  console.error("Usage: pnpm tsx scripts/wipe-all-data.mts --yes-wipe");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const masked = url.replace(/:[^:@/]+@/, ":***@");
console.log(`Wiping all data from: ${masked}`);

const client = postgres(url);
try {
  await client.unsafe(`
    TRUNCATE TABLE
      parent_student, parent, student,
      teacher_assignment, section, class_subject, subject, class, academic_year,
      account, session, verification, "user"
    RESTART IDENTITY CASCADE
  `);
  console.log("Done. All data tables truncated; schema intact.");
} finally {
  await client.end();
}
