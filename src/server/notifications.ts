"use server";

import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationLog } from "@/lib/db/schema/communications";
import { requireAbility } from "./session";

export async function listAllNotifications(limit = 200) {
  await requireAbility("notifications.view-all");
  return db.select().from(notificationLog).orderBy(desc(notificationLog.createdAt)).limit(limit);
}
