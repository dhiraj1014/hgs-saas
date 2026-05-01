// src/lib/notifier/stub.ts
import type { DB } from "../db";
import { notificationLog } from "../db/schema/communications";
import type { Notifier, NotificationResult, AttendanceAlertData, RelatedEntity } from "./types";

export function createStubNotifier(db: DB): Notifier {
  async function log(args: {
    templateKey: "parent_otp" | "attendance_absent" | "attendance_late" | "announcement";
    phone: string;
    related?: RelatedEntity;
    /** Stub-only: persisted in providerMessageId so dev tools / E2E tests can read it. */
    debugPayload?: string;
  }): Promise<NotificationResult> {
    await db.insert(notificationLog).values({
      channel: "sms",
      templateKey: args.templateKey,
      recipientPhone: args.phone,
      status: "stub_sent",
      provider: "stub",
      providerMessageId: args.debugPayload,
      relatedEntityType: args.related?.type,
      relatedEntityId: args.related?.id,
    });
    return { status: "stub_sent" };
  }

  return {
    sendParentOtp(phone, code, related) {
      return log({ templateKey: "parent_otp", phone, related, debugPayload: code });
    },
    sendAttendanceAlert(phone, data, related) {
      return log({
        templateKey: data.status === "absent" ? "attendance_absent" : "attendance_late",
        phone,
        related,
      });
    },
    sendAnnouncement(phone, _body, related) {
      return log({ templateKey: "announcement", phone, related });
    },
  };
}
