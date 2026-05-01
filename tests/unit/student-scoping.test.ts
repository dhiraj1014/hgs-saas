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

  describe("parent role scoping (Phase 1)", () => {
    let p1DbCtx: Awaited<ReturnType<typeof freshTestDb>>;

    beforeEach(async () => {
      p1DbCtx = await freshTestDb();
      const { db } = p1DbCtx;

      // Minimal academic scaffold needed for student rows
      const [yr] = await db.insert(academicYear).values({
        name: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", isCurrent: true,
      }).returning();
      const [cls] = await db.insert(class_).values({ name: "Grade 5", order: 5 }).returning();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const [sec] = await db.insert(section).values({
        classId: cls!.id, academicYearId: yr!.id, name: "A",
      }).returning();

      // Three users for the three test cases
      await db.insert(user).values([
        { id: "p1-u1", email: "p1parent1@x", name: "Parent One", role: "parent", phoneNumber: "+919000000001" },
        { id: "p1-u2", email: "p1parent2@x", name: "Parent Two", role: "parent", phoneNumber: "+919000000099" },
        { id: "p1-u3", email: "p1parent3@x", name: "Parent Three", role: "parent", phoneNumber: "+919000000003" },
      ]);

      // Two students for the 2-student test case
      const [st1] = await db.insert(student).values({
        admissionNo: "P1T-0001", firstName: "Child", lastName: "One", currentSectionId: sec!.id,
      }).returning();
      const [st2] = await db.insert(student).values({
        admissionNo: "P1T-0002", firstName: "Child", lastName: "Two", currentSectionId: sec!.id,
      }).returning();

      // Parent row linked to +919000000001, with 2 student links
      const [p2s] = await db.insert(parent).values({
        fullName: "Parent of Two Students", phone: "+919000000001",
      }).returning();
      await db.insert(parentStudent).values([
        { parentId: p2s!.id, studentId: st1!.id, isPrimaryContact: true },
        { parentId: p2s!.id, studentId: st2!.id, isPrimaryContact: false },
      ]);

      // Parent row linked to +919000000003, with zero student links
      await db.insert(parent).values({
        fullName: "Parent with No Links", phone: "+919000000003",
      });

      // No parent row at all for +919000000099
    });

    it("parent: phone matches parent row with 2 students → returns both ids", async () => {
      const ids = await permittedStudentIds(p1DbCtx.db, { userId: "p1-u1", role: "parent" });
      expect(ids.size).toBe(2);
    });

    it("parent: phone matches no parent row → returns empty Set", async () => {
      const ids = await permittedStudentIds(p1DbCtx.db, { userId: "p1-u2", role: "parent" });
      expect(ids.size).toBe(0);
    });

    it("parent: phone matches parent row with 0 student links → returns empty Set", async () => {
      const ids = await permittedStudentIds(p1DbCtx.db, { userId: "p1-u3", role: "parent" });
      expect(ids.size).toBe(0);
    });
  });
});
