// tests/unit/notifier/stub.test.ts
import { describe, it, expect } from "vitest";
import { freshTestDb } from "../../helpers/pglite";
import { createStubNotifier } from "@/lib/notifier/stub";
import { notificationLog } from "@/lib/db/schema/communications";

describe("stub notifier", () => {
  it("sendParentOtp writes a notification_log row with status=stub_sent and the code in providerMessageId", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    const result = await notifier.sendParentOtp("+919000000001", "123456");
    expect(result.status).toBe("stub_sent");
    const rows = await db.select().from(notificationLog);
    expect(rows.length).toBe(1);
    expect(rows[0]?.status).toBe("stub_sent");
    expect(rows[0]?.templateKey).toBe("parent_otp");
    expect(rows[0]?.recipientPhone).toBe("+919000000001");
    expect(rows[0]?.provider).toBe("stub");
    // Stub persists the OTP code in providerMessageId so E2E tests can fetch it.
    // Real MSG91 puts its request_id there; this is dev/test-only behavior.
    expect(rows[0]?.providerMessageId).toBe("123456");
  });

  it("sendAttendanceAlert writes a stub_sent row with related entity", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    const result = await notifier.sendAttendanceAlert(
      "+919000000002",
      { studentName: "S", date: "01-May-2026", status: "absent", sectionName: "Grade 1 · A" },
      { type: "attendance", id: "00000000-0000-0000-0000-000000000001" },
    );
    expect(result.status).toBe("stub_sent");
    const rows = await db.select().from(notificationLog);
    expect(rows[0]?.relatedEntityType).toBe("attendance");
    expect(rows[0]?.templateKey).toBe("attendance_absent");
  });

  it("sendAnnouncement writes a stub_sent row with template_key=announcement", async () => {
    const { db } = await freshTestDb();
    const notifier = createStubNotifier(db);
    await notifier.sendAnnouncement("+919000000003", "School closed tomorrow.");
    const rows = await db.select().from(notificationLog);
    expect(rows[0]?.templateKey).toBe("announcement");
    expect(rows[0]?.status).toBe("stub_sent");
  });
});
