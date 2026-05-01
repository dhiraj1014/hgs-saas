import { describe, expect, it, beforeEach } from "vitest";
import { freshTestDb } from "../helpers/pglite";
import { permittedStudentIds } from "@/lib/student-scoping";
import { academicYear, class_, section } from "@/lib/db/schema/academic";
import { user } from "@/lib/db/schema/auth";
import { student, parent, parentStudent, teacherAssignment } from "@/lib/db/schema/people";
import { eq } from "drizzle-orm";

describe("permittedStudentIds", () => {
  let dbCtx: Awaited<ReturnType<typeof freshTestDb>>;

  beforeEach(async () => {
    dbCtx = await freshTestDb();
    const { db } = dbCtx;

    const [yr] = await db.insert(academicYear).values({
      name: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", isCurrent: true,
    }).returning();

    const [cls] = await db.insert(class_).values({ name: "Grade 5", order: 5 }).returning();
    const [secA] = await db.insert(section).values({ classId: cls.id, academicYearId: yr.id, name: "A" }).returning();
    const [secB] = await db.insert(section).values({ classId: cls.id, academicYearId: yr.id, name: "B" }).returning();

    await db.insert(user).values([
      { id: "u-admin", email: "admin@x", name: "Admin", role: "super_admin" },
      { id: "u-teacher", email: "t@x", name: "Teacher", role: "class_teacher" },
      { id: "u-parent", email: "p@x", name: "Parent", role: "parent" },
    ]);

    const [s1] = await db.insert(student).values({
      admissionNo: "001", firstName: "Aarav", lastName: "Kumar", currentSectionId: secA.id,
    }).returning();
    const [s2] = await db.insert(student).values({
      admissionNo: "002", firstName: "Vihaan", lastName: "Singh", currentSectionId: secB.id,
    }).returning();

    await db.insert(teacherAssignment).values({
      userId: "u-teacher", sectionId: secA.id, academicYearId: yr.id, roleInSection: "class_teacher",
    });

    const [p] = await db.insert(parent).values({ fullName: "Parent of Aarav", phone: "+919999900001" }).returning();
    await db.insert(parentStudent).values({ parentId: p.id, studentId: s1.id, isPrimaryContact: true });

    await db.update(user).set({ phoneNumber: "+919999900001" }).where(eq(user.id, "u-parent"));
  });

  it("super_admin sees every student", async () => {
    const ids = await permittedStudentIds(dbCtx.db, { userId: "u-admin", role: "super_admin" });
    expect(ids.size).toBe(2);
  });

  it("class_teacher sees only their assigned section's students", async () => {
    const ids = await permittedStudentIds(dbCtx.db, { userId: "u-teacher", role: "class_teacher" });
    expect(ids.size).toBe(1);
  });

  it("parent sees only their own children", async () => {
    const ids = await permittedStudentIds(dbCtx.db, { userId: "u-parent", role: "parent" });
    expect(ids.size).toBe(1);
  });

  it("returns all students for accountant", async () => {
    const ids = await permittedStudentIds(dbCtx.db, { userId: "u-admin", role: "accountant" });
    expect(ids.size).toBe(2);
  });
});
