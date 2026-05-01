import { describe, expect, it } from "vitest";
import { can, type Role } from "@/lib/permissions";

describe("permissions.can", () => {
  it("super_admin can do anything", () => {
    expect(can("super_admin", "students.create")).toBe(true);
    expect(can("super_admin", "marks.lock")).toBe(true);
    expect(can("super_admin", "fees.refund")).toBe(true);
  });

  it("principal can lock marks but not refund fees", () => {
    expect(can("principal", "marks.lock")).toBe(true);
    expect(can("principal", "fees.refund")).toBe(false);
  });

  it("office_staff can manage students but not edit marks", () => {
    expect(can("office_staff", "students.create")).toBe(true);
    expect(can("office_staff", "marks.edit")).toBe(false);
  });

  it("class_teacher can mark attendance for own section only", () => {
    expect(can("class_teacher", "attendance.mark")).toBe(true);
  });

  it("subject_teacher can edit marks for assigned subject", () => {
    expect(can("subject_teacher", "marks.edit")).toBe(true);
    expect(can("subject_teacher", "students.create")).toBe(false);
  });

  it("parent has no staff capabilities", () => {
    expect(can("parent", "students.create")).toBe(false);
    expect(can("parent", "attendance.mark")).toBe(false);
  });

  const roles: Role[] = ["super_admin", "principal", "office_staff", "accountant", "class_teacher", "subject_teacher", "parent"];
  it.each(roles)("returns false for unknown ability for %s", (role) => {
    expect(can(role, "totally.fake.ability" as never)).toBe(false);
  });
});

describe("Phase 1 abilities", () => {
  it("class_teacher has attendance.mark", () => {
    expect(can("class_teacher", "attendance.mark")).toBe(true);
  });
  it("subject_teacher does not have attendance.mark", () => {
    expect(can("subject_teacher", "attendance.mark")).toBe(false);
  });
  it("super_admin has attendance.mark, attendance.view-all, announcements.send-school-wide", () => {
    expect(can("super_admin", "attendance.mark")).toBe(true);
    expect(can("super_admin", "attendance.view-all")).toBe(true);
    expect(can("super_admin", "announcements.send-school-wide")).toBe(true);
  });
  it("principal has announcements.send but not announcements.send-school-wide", () => {
    expect(can("principal", "announcements.send")).toBe(true);
    expect(can("principal", "announcements.send-school-wide")).toBe(false);
  });
  it("office_staff has attendance.view-all but not announcements.send", () => {
    expect(can("office_staff", "attendance.view-all")).toBe(true);
    expect(can("office_staff", "announcements.send")).toBe(false);
  });
  it("parent has attendance.view-own-children, announcements.view, notifications.view-own", () => {
    expect(can("parent", "attendance.view-own-children")).toBe(true);
    expect(can("parent", "announcements.view")).toBe(true);
    expect(can("parent", "notifications.view-own")).toBe(true);
  });
  it("parent does NOT have attendance.mark or notifications.view-all", () => {
    expect(can("parent", "attendance.mark")).toBe(false);
    expect(can("parent", "notifications.view-all")).toBe(false);
  });
});
