// tests/unit/announcements.test.ts
import { describe, it, expect } from "vitest";
import { freshTestDb } from "../helpers/pglite";
import { user } from "@/lib/db/schema/auth";
import { academicYear, class_, section } from "@/lib/db/schema/academic";
import { student, parent, parentStudent } from "@/lib/db/schema/people";
import { announcement, notificationLog } from "@/lib/db/schema/communications";
import { sendAnnouncement } from "@/lib/announcement-core";
import { createStubNotifier } from "@/lib/notifier/stub";
import { eq } from "drizzle-orm";

async function setup(db: any) {
  const [yr] = await db.insert(academicYear).values({ name: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", isCurrent: true }).returning();
  const [c1] = await db.insert(class_).values({ name: "Grade 1", order: 1 }).returning();
  const [c2] = await db.insert(class_).values({ name: "Grade 2", order: 2 }).returning();
  const [s1] = await db.insert(section).values({ classId: c1!.id, academicYearId: yr!.id, name: "A" }).returning();
  const [s2] = await db.insert(section).values({ classId: c2!.id, academicYearId: yr!.id, name: "A" }).returning();
  const [sender] = await db.insert(user).values({ id: "u-admin", email: "a@x", name: "A", role: "super_admin" }).returning();
  return { yr: yr!, c1: c1!, c2: c2!, s1: s1!, s2: s2!, sender: sender! };
}

async function addStudentWithParent(db: any, sectionId: string, admNo: string, parentPhone: string) {
  const [s] = await db.insert(student).values({ admissionNo: admNo, firstName: admNo, lastName: "T", currentSectionId: sectionId }).returning();
  let parentRow = (await db.select().from(parent).where(eq(parent.phone, parentPhone)).limit(1))[0];
  if (!parentRow) {
    [parentRow] = await db.insert(parent).values({ fullName: `P ${admNo}`, phone: parentPhone }).returning();
  }
  await db.insert(parentStudent).values({ parentId: parentRow!.id, studentId: s!.id, isPrimaryContact: true });
  return s!;
}

describe("sendAnnouncement", () => {
  it("school audience: fans out to every parent (deduped by phone)", async () => {
    const { db } = await freshTestDb();
    const ctx = await setup(db);
    await addStudentWithParent(db, ctx.s1.id, "T0001", "+919000000001");
    await addStudentWithParent(db, ctx.s2.id, "T0002", "+919000000002");
    // sibling case: parent +919000000003 has 2 kids
    await addStudentWithParent(db, ctx.s1.id, "T0003", "+919000000003");
    await addStudentWithParent(db, ctx.s2.id, "T0004", "+919000000003");
    const result = await sendAnnouncement(db, {
      sentBy: ctx.sender.id,
      audienceType: "school",
      audienceRef: null,
      body: "Holiday tomorrow.",
    }, createStubNotifier(db));
    expect(result.recipientCount).toBe(3);    // deduped
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(3);
    const ann = await db.select().from(announcement);
    expect(ann.length).toBe(1);
    expect(ann[0]?.recipientCount).toBe(3);
  });

  it("class audience: parents of students in any section of the class", async () => {
    const { db } = await freshTestDb();
    const ctx = await setup(db);
    await addStudentWithParent(db, ctx.s1.id, "T0001", "+919000000001"); // class 1
    await addStudentWithParent(db, ctx.s2.id, "T0002", "+919000000002"); // class 2
    const result = await sendAnnouncement(db, {
      sentBy: ctx.sender.id,
      audienceType: "class",
      audienceRef: { classId: ctx.c1.id },
      body: "Grade 1 only.",
    }, createStubNotifier(db));
    expect(result.recipientCount).toBe(1);
  });

  it("section audience: only parents of that section", async () => {
    const { db } = await freshTestDb();
    const ctx = await setup(db);
    await addStudentWithParent(db, ctx.s1.id, "T0001", "+919000000001");
    await addStudentWithParent(db, ctx.s2.id, "T0002", "+919000000002");
    const result = await sendAnnouncement(db, {
      sentBy: ctx.sender.id,
      audienceType: "section",
      audienceRef: { sectionId: ctx.s2.id },
      body: "Section 2A only.",
    }, createStubNotifier(db));
    expect(result.recipientCount).toBe(1);
    const logs = await db.select().from(notificationLog);
    expect(logs[0]?.recipientPhone).toBe("+919000000002");
  });

  it("students audience: only parents of those specific students", async () => {
    const { db } = await freshTestDb();
    const ctx = await setup(db);
    const s1 = await addStudentWithParent(db, ctx.s1.id, "T0001", "+919000000001");
    await addStudentWithParent(db, ctx.s1.id, "T0002", "+919000000002");
    const result = await sendAnnouncement(db, {
      sentBy: ctx.sender.id,
      audienceType: "students",
      audienceRef: { studentIds: [s1.id] },
      body: "One student only.",
    }, createStubNotifier(db));
    expect(result.recipientCount).toBe(1);
  });
});
