// src/lib/notifier/index.ts
import { db } from "../db";
import { createStubNotifier } from "./stub";
import { createMsg91Notifier, type Msg91Config } from "./msg91";
import type { NotificationResult, AttendanceAlertData, RelatedEntity, TemplateKey } from "./types";

if (process.env.NODE_ENV === "production" && !process.env.MSG91_AUTH_KEY) {
  throw new Error("MSG91_AUTH_KEY must be set in production");
}

const stub = createStubNotifier(db);

const msg91Config: Msg91Config = {
  authKey: process.env.MSG91_AUTH_KEY ?? "",
  senderId: process.env.MSG91_SENDER_ID ?? "HGSPAT",
  templates: {
    parent_otp: process.env.MSG91_TEMPLATE_ID_PARENT_OTP ?? "",
    attendance_absent: process.env.MSG91_TEMPLATE_ID_ATTENDANCE_ALERT ?? "",
    attendance_late: process.env.MSG91_TEMPLATE_ID_ATTENDANCE_ALERT ?? "",
    announcement: process.env.MSG91_TEMPLATE_ID_ANNOUNCEMENT ?? "",
  },
};

const msg91 = createMsg91Notifier(db, msg91Config);

export function resolveImpl(templateKey: TemplateKey): "msg91" | "stub" {
  const flag =
    templateKey === "parent_otp" ? process.env.MSG91_ENABLED_FOR_OTP :
    templateKey === "announcement" ? process.env.MSG91_ENABLED_FOR_ANNOUNCEMENTS :
    process.env.MSG91_ENABLED_FOR_ATTENDANCE;
  return flag === "true" && msg91Config.authKey ? "msg91" : "stub";
}

export const notifier = {
  sendParentOtp(phone: string, code: string, related?: RelatedEntity): Promise<NotificationResult> {
    return resolveImpl("parent_otp") === "msg91"
      ? msg91.sendParentOtp(phone, code, related)
      : stub.sendParentOtp(phone, code, related);
  },
  sendAttendanceAlert(phone: string, data: AttendanceAlertData, related?: RelatedEntity): Promise<NotificationResult> {
    return resolveImpl(data.status === "absent" ? "attendance_absent" : "attendance_late") === "msg91"
      ? msg91.sendAttendanceAlert(phone, data, related)
      : stub.sendAttendanceAlert(phone, data, related);
  },
  sendAnnouncement(phone: string, body: string, related?: RelatedEntity): Promise<NotificationResult> {
    return resolveImpl("announcement") === "msg91"
      ? msg91.sendAnnouncement(phone, body, related)
      : stub.sendAnnouncement(phone, body, related);
  },
};

export type { NotificationResult, AttendanceAlertData, RelatedEntity, TemplateKey } from "./types";
