// tests/unit/notifier/msg91.test.ts
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { freshTestDb } from "../../helpers/pglite";
import { createMsg91Notifier } from "@/lib/notifier/msg91";
import { notificationLog } from "@/lib/db/schema/communications";

const config = {
  authKey: "test-key",
  senderId: "HGSPAT",
  templates: {
    parent_otp: "test-otp-template-id",
    attendance_absent: "test-att-template-id",
    attendance_late: "test-att-template-id",
    announcement: "test-ann-template-id",
  },
};

describe("msg91 notifier", () => {
  // Pre-warm PGlite (loads WASM via real fetch) before any test stubs globalThis.fetch.
  beforeAll(async () => {
    await freshTestDb();
  }, 60_000);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sendParentOtp: success writes status=sent and provider_message_id", async () => {
    const { db } = await freshTestDb();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ type: "success", request_id: "abc-123" }),
      { status: 200, headers: { "content-type": "application/json" } },
    )));
    const n = createMsg91Notifier(db, config);
    const result = await n.sendParentOtp("+919000000001", "123456");
    expect(result.status).toBe("sent");
    expect(result.providerMessageId).toBe("abc-123");
    const rows = await db.select().from(notificationLog);
    expect(rows[0]?.status).toBe("sent");
    expect(rows[0]?.provider).toBe("msg91");
    expect(rows[0]?.providerMessageId).toBe("abc-123");
  });

  it("sendParentOtp: 4xx writes status=failed with errorMessage", async () => {
    const { db } = await freshTestDb();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ type: "error", message: "Invalid phone number" }),
      { status: 400, headers: { "content-type": "application/json" } },
    )));
    const n = createMsg91Notifier(db, config);
    const result = await n.sendParentOtp("+919000000001", "123456");
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("Invalid phone number");
    const rows = await db.select().from(notificationLog);
    expect(rows[0]?.status).toBe("failed");
  });

  it("sendParentOtp: 5xx triggers single retry, second attempt succeeds", async () => {
    const { db } = await freshTestDb();
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls++;
      if (calls === 1) return new Response("oops", { status: 502 });
      return new Response(
        JSON.stringify({ type: "success", request_id: "xyz-789" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }));
    const n = createMsg91Notifier(db, config);
    const result = await n.sendParentOtp("+919000000001", "123456");
    expect(calls).toBe(2);
    expect(result.status).toBe("sent");
  });

  it("sendParentOtp: two consecutive 5xx → status=failed", async () => {
    const { db } = await freshTestDb();
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls++;
      return new Response("oops", { status: 503 });
    }));
    const n = createMsg91Notifier(db, config);
    const result = await n.sendParentOtp("+919000000001", "123456");
    expect(calls).toBe(2);
    expect(result.status).toBe("failed");
  });

  it("sendParentOtp: timeout triggers retry; two consecutive timeouts → status=failed", async () => {
    const { db } = await freshTestDb();
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      calls++;
      // Simulate a timeout by immediately rejecting with AbortError after a microtask,
      // without needing to advance real timers.
      await Promise.resolve(); // yield to allow signal listeners to register
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }));
    const n = createMsg91Notifier(db, config);
    const result = await n.sendParentOtp("+919000000001", "123456");
    expect(calls).toBe(2);
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toMatch(/timed out/);
  });

  it("sendAttendanceAlert: missing template id returns failed without calling fetch", async () => {
    const { db } = await freshTestDb();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const cfg = { ...config, templates: { ...config.templates, attendance_absent: "" } };
    const n = createMsg91Notifier(db, cfg);
    const result = await n.sendAttendanceAlert(
      "+919000000001",
      { studentName: "S", date: "01-May-2026", status: "absent", sectionName: "G1 · A" },
    );
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("template");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
