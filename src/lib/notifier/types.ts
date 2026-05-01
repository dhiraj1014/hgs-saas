// src/lib/notifier/types.ts

export type TemplateKey = "parent_otp" | "attendance_absent" | "attendance_late" | "announcement";

export type NotificationStatus = "sent" | "stub_sent" | "failed" | "skipped_no_phone" | "rate_limited";

export interface NotificationResult {
  status: NotificationStatus;
  providerMessageId?: string;
  errorMessage?: string;
}

export interface AttendanceAlertData {
  studentName: string;
  date: string;       // formatted DD-MMM-YYYY
  status: "absent" | "late";
  sectionName: string;
}

export interface RelatedEntity {
  type: "attendance" | "announcement" | "parent_otp";
  id: string;
}

export interface Notifier {
  sendParentOtp(phone: string, code: string, related?: RelatedEntity): Promise<NotificationResult>;
  sendAttendanceAlert(phone: string, data: AttendanceAlertData, related?: RelatedEntity): Promise<NotificationResult>;
  sendAnnouncement(phone: string, body: string, related?: RelatedEntity): Promise<NotificationResult>;
}
