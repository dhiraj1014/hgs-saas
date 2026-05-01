"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationLog } from "@/lib/db/schema/communications";
import { requireAbility, requireParent } from "./session";

export async function listAllNotifications(limit = 200) {
  await requireAbility("notifications.view-all");
  return db.select().from(notificationLog).orderBy(desc(notificationLog.createdAt)).limit(limit);
}

export async function listNotificationsForParent() {
  const session = await requireParent();
  const phone = (session.user as { phoneNumber?: string }).phoneNumber;
  if (!phone) return [];
  return db
    .select()
    .from(notificationLog)
    .where(eq(notificationLog.recipientPhone, phone))
    .orderBy(desc(notificationLog.createdAt))
    .limit(100);
}
