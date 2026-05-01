// Force IPv4 DNS resolution; see scripts/create-admin.mts for why.
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { academicYear, class_, section, subject } from "../src/lib/db/schema/academic";
import { student, parent, parentStudent, teacherAssignment } from "../src/lib/db/schema/people";
import { user } from "../src/lib/db/schema/auth";
import { auth } from "../src/lib/auth";

async function main() {
  console.log("Seeding…");

  // Wipe (dev only — never run in prod!)
  await db.delete(teacherAssignment);
  await db.delete(parentStudent);
  await db.delete(parent);
  await db.delete(student);
  await db.delete(section);
  await db.delete(subject);
  await db.delete(class_);
  await db.delete(academicYear);
  await db.delete(user);

  const [yr] = await db.insert(academicYear).values({
    name: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", isCurrent: true,
  }).returning();
  if (!yr) throw new Error("Year insert failed");

  const grades = await db.insert(class_).values(
    [1, 2, 3, 4, 5].map((n) => ({ name: `Grade ${n}`, order: n }))
  ).returning();

  for (const g of grades) {
    await db.insert(section).values([
      { classId: g.id, academicYearId: yr.id, name: "A" },
      { classId: g.id, academicYearId: yr.id, name: "B" },
    ]);
  }

  await db.insert(subject).values([
    { name: "Mathematics", code: "MATH" },
    { name: "English", code: "ENG" },
    { name: "Hindi", code: "HIN" },
    { name: "Science", code: "SCI" },
    { name: "Social Studies", code: "SST" },
  ]);

  const allSections = await db.select().from(section);
  const studentRows = [];
  let admissionCounter = 1;
  for (const sec of allSections) {
    for (let i = 0; i < 5; i++) {
      const num = String(admissionCounter++).padStart(4, "0");
      const [s] = await db.insert(student).values({
        admissionNo: `HGS${num}`,
        firstName: `Student${num}`,
        lastName: "Test",
        currentSectionId: sec.id,
      }).returning();
      if (!s) throw new Error("Student insert failed");
      const [p] = await db.insert(parent).values({
        fullName: `Parent of ${num}`,
        phone: `+91900000${num}`,
      }).returning();
      if (!p) throw new Error("Parent insert failed");
      await db.insert(parentStudent).values({ parentId: p.id, studentId: s.id, isPrimaryContact: true });
      studentRows.push(s);
    }
  }

  await auth.api.signUpEmail({
    body: { email: "admin@hgs.local", password: "admin1234", name: "Admin", role: "super_admin" },
  });
  await auth.api.signUpEmail({
    body: { email: "teacher@hgs.local", password: "teacher1234", name: "Teacher", role: "class_teacher" },
  });

  // Phase 1: a sample parent linked to first student for testing
  const samplePhone = "+919999999999";
  const sampleParent = await db.insert(parent).values({
    fullName: "Sample Parent", phone: samplePhone,
  }).returning();
  if (sampleParent[0] && studentRows[0]) {
    await db.insert(parentStudent).values({
      parentId: sampleParent[0].id, studentId: studentRows[0].id, isPrimaryContact: true,
    });
  }
  console.log(`Sample parent phone for testing: ${samplePhone}`);

  // Phase 1: assign the teacher@hgs.local user to the first section as class_teacher
  const teacherUserRows = await db.select().from(user).where(eq(user.email, "teacher@hgs.local"));
  const teacherUser = teacherUserRows[0];
  if (teacherUser && allSections[0]) {
    await db.insert(teacherAssignment).values({
      userId: teacherUser.id, sectionId: allSections[0].id, academicYearId: yr.id, roleInSection: "class_teacher",
    });
    console.log(`Assigned teacher@hgs.local as class_teacher of section ${allSections[0].id}`);
  }

  console.log(`Done. ${studentRows.length} students seeded across ${allSections.length} sections.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
