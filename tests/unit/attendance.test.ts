// tests/unit/attendance.test.ts
import { describe, it, expect } from "vitest";
import { freshTestDb } from "../helpers/pglite";
import { user } from "@/lib/db/schema/auth";
import { academicYear, class_, section } from "@/lib/db/schema/academic";
import { student, parent, parentStudent, teacherAssignment } from "@/lib/db/schema/people";
import { attendance, notificationLog } from "@/lib/db/schema/communications";
import { markAttendance } from "@/lib/attendance-core";
import { createStubNotifier } from "@/lib/notifier/stub";

async function setupSchool(db: any) {
  const [yr] = await db.insert(academicYear).values({ name: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", isCurrent: true }).returning();
  const [cls] = await db.insert(class_).values({ name: "Grade 1", order: 1 }).returning();
  const [sec] = await db.insert(section).values({ classId: cls!.id, academicYearId: yr!.id, name: "A" }).returning();
  const [tch] = await db.insert(user).values({ id: "u-tch-1", email: "t@x", name: "T", role: "class_teacher" }).returning();
  await db.insert(teacherAssignment).values({ userId: tch!.id, sectionId: sec!.id, academicYearId: yr!.id, roleInSection: "class_teacher" });
  return { yr: yr!, cls: cls!, sec: sec!, tch: tch! };
}
async function addStudentWithParent(db: any, sectionId: string, admissionNo: string, phone?: string) {
  const [s] = await db.insert(student).values({ admissionNo, firstName: admissionNo, lastName: "T", currentSectionId: sectionId }).returning();
  if (phone) {
    const [p] = await db.insert(parent).values({ fullName: `P ${admissionNo}`, phone }).returning();
    await db.insert(parentStudent).values({ parentId: p!.id, studentId: s!.id, isPrimaryContact: true });
  }
  return s!;
}

describe("markAttendance (core logic)", () => {
  it("inserts rows for all entries; no notifications for present students", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001", "+919000000001");
    const s2 = await addStudentWithParent(db, sec.id, "T0002", "+919000000002");
    const result = await markAttendance(db, {
      sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [
        { studentId: s1.id, status: "present" },
        { studentId: s2.id, status: "present" },
      ],
    }, notifier);
    expect(result.marked).toBe(2);
    expect(result.notified).toBe(0);
    expect(result.failed).toBe(0);
    const rows = await db.select().from(attendance);
    expect(rows.length).toBe(2);
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(0);
  });

  it("absent triggers one notification per absent student with primary parent", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001", "+919000000001");
    const s2 = await addStudentWithParent(db, sec.id, "T0002", "+919000000002");
    const result = await markAttendance(db, {
      sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [
        { studentId: s1.id, status: "absent" },
        { studentId: s2.id, status: "present" },
      ],
    }, notifier);
    expect(result.notified).toBe(1);
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(1);
    expect(logs[0]?.recipientPhone).toBe("+919000000001");
    expect(logs[0]?.templateKey).toBe("attendance_absent");
  });

  it("re-marking same status does not re-notify", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001", "+919000000001");
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "absent" }] }, notifier);
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "absent" }] }, notifier);
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(1);
  });

  it("transition from absent to present does not send a 'now present' notification", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001", "+919000000001");
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "absent" }] }, notifier);
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "present" }] }, notifier);
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(1);  // only the original absent
  });

  it("transition from present to absent triggers one notification", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001", "+919000000001");
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "present" }] }, notifier);
    await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "absent" }] }, notifier);
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(1);
  });

  it("student with no primary parent is counted as skipped, no log row", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    const { sec, tch } = await setupSchool(db);
    const s1 = await addStudentWithParent(db, sec.id, "T0001"); // no phone
    const result = await markAttendance(db, { sectionId: sec.id, date: "2026-05-01", markerId: tch.id,
      entries: [{ studentId: s1.id, status: "absent" }] }, notifier);
    expect(result.notified).toBe(0);
    expect(result.skipped).toBe(1);
    const logs = await db.select().from(notificationLog);
    expect(logs.length).toBe(0);
  });
});
