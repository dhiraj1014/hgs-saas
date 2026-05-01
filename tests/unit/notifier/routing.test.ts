// tests/unit/notifier/routing.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("notifier env routing", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("MSG91_") || k === "NODE_ENV") delete process.env[k];
    }
  });
  afterEach(() => {
    vi.resetModules();
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("MSG91_") || k === "NODE_ENV") delete process.env[k];
    }
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("when MSG91_ENABLED_FOR_OTP=true and key set, OTP routes through msg91", async () => {
    process.env.NODE_ENV = "test";
    process.env.MSG91_AUTH_KEY = "k";
    process.env.MSG91_SENDER_ID = "HGSPAT";
    process.env.MSG91_TEMPLATE_ID_PARENT_OTP = "tid";
    process.env.MSG91_ENABLED_FOR_OTP = "true";
    const { resolveImpl } = await import("@/lib/notifier/index");
    expect(resolveImpl("parent_otp")).toBe("msg91");
  });

  it("when MSG91_ENABLED_FOR_OTP=false, OTP routes through stub", async () => {
    process.env.NODE_ENV = "test";
    process.env.MSG91_AUTH_KEY = "k";
    process.env.MSG91_ENABLED_FOR_OTP = "false";
    const { resolveImpl } = await import("@/lib/notifier/index");
    expect(resolveImpl("parent_otp")).toBe("stub");
  });

  it("attendance and announcement default to stub when flags unset", async () => {
    process.env.NODE_ENV = "test";
    const { resolveImpl } = await import("@/lib/notifier/index");
    expect(resolveImpl("attendance_absent")).toBe("stub");
    expect(resolveImpl("announcement")).toBe("stub");
  });

  it("NODE_ENV=production with no MSG91_AUTH_KEY throws on import", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.MSG91_AUTH_KEY;
    await expect(import("@/lib/notifier/index")).rejects.toThrow(/MSG91_AUTH_KEY/);
  });
});
