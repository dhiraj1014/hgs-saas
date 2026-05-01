// src/lib/notifier/msg91.ts
import type { DB } from "../db";
import { notificationLog } from "../db/schema/communications";
import type { Notifier, NotificationResult, AttendanceAlertData, RelatedEntity, TemplateKey } from "./types";

export interface Msg91Config {
  authKey: string;
  senderId: string;
  templates: Record<TemplateKey, string>;
}

const ENDPOINT = "https://control.msg91.com/api/v5/flow/";
const TIMEOUT_MS = 10_000;

export function createMsg91Notifier(db: DB, config: Msg91Config): Notifier {
  async function send(args: {
    templateKey: TemplateKey;
    phone: string;
    variables: Record<string, string>;
    related?: RelatedEntity;
  }): Promise<NotificationResult> {
    const templateId = config.templates[args.templateKey];
    if (!templateId) {
      const errorMessage = `MSG91 template id not configured for ${args.templateKey}`;
      await db.insert(notificationLog).values({
        channel: "sms", templateKey: args.templateKey, recipientPhone: args.phone,
        status: "failed", provider: "msg91", errorMessage,
        relatedEntityType: args.related?.type, relatedEntityId: args.related?.id,
      });
      return { status: "failed", errorMessage };
    }

    const body = {
      template_id: templateId,
      sender: config.senderId,
      short_url: 0,
      recipients: [{ mobiles: args.phone.replace(/^\+/, ""), ...args.variables }],
    };

    const result = await sendWithRetry(config.authKey, body);

    await db.insert(notificationLog).values({
      channel: "sms", templateKey: args.templateKey, recipientPhone: args.phone,
      status: result.status, provider: "msg91",
      providerMessageId: result.providerMessageId,
      errorMessage: result.errorMessage,
      relatedEntityType: args.related?.type, relatedEntityId: args.related?.id,
    });

    return result;
  }

  return {
    sendParentOtp(phone, code, related) {
      return send({ templateKey: "parent_otp", phone, variables: { otp: code }, related });
    },
    sendAttendanceAlert(phone, data, related) {
      return send({
        templateKey: data.status === "absent" ? "attendance_absent" : "attendance_late",
        phone,
        variables: { name: data.studentName, date: data.date, section: data.sectionName },
        related,
      });
    },
    sendAnnouncement(phone, body, related) {
      return send({ templateKey: "announcement", phone, variables: { message: body }, related });
    },
  };
}

async function sendWithRetry(authKey: string, body: unknown): Promise<NotificationResult> {
  const first = await sendOnce(authKey, body);
  const isRetryable = first.errorClass === "5xx" || first.errorClass === "timeout";
  if (first.status === "sent" || !isRetryable) return toResult(first);
  const second = await sendOnce(authKey, body);
  return toResult(second);
}

type RawResult = {
  status: "sent" | "failed";
  providerMessageId?: string;
  errorMessage?: string;
  errorClass?: "4xx" | "5xx" | "timeout" | "network";
};

async function sendOnce(authKey: string, body: unknown): Promise<RawResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "authkey": authKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({})) as { request_id?: string };
      return { status: "sent", providerMessageId: data.request_id };
    }
    const text = await res.text().catch(() => "");
    return {
      status: "failed",
      errorMessage: `HTTP ${res.status}: ${text.slice(0, 200)}`,
      errorClass: res.status >= 500 ? "5xx" : "4xx",
    };
  } catch (e) {
    const isAbort = e instanceof Error && e.name === "AbortError";
    return {
      status: "failed",
      errorMessage: isAbort ? "MSG91 request timed out" : (e instanceof Error ? e.message : "MSG91 network error"),
      errorClass: isAbort ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timer);
  }
}

function toResult(r: RawResult): NotificationResult {
  return r.status === "sent"
    ? { status: "sent", providerMessageId: r.providerMessageId }
    : { status: "failed", errorMessage: r.errorMessage };
}
