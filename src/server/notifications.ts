"use server";

import { and, asc, count, desc, eq, gte, ilike, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationLog } from "@/lib/db/schema/communications";
import { requireAbility, requireParent } from "./session";

export type NotificationSortKey = "createdAt" | "status" | "templateKey";
export type SortDir = "asc" | "desc";
export type NotificationRange = "7d" | "30d" | "all";

const NOTIF_SORT_COLUMNS = {
  createdAt: notificationLog.createdAt,
  status: notificationLog.status,
  templateKey: notificationLog.templateKey,
} as const;

function rangeStart(range: NotificationRange): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : 30;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export async function listAllNotifications(filter?: {
  q?: string;
  status?: string;
  template?: string;
  sort?: NotificationSortKey;
  dir?: SortDir;
  range?: NotificationRange;
  page?: number;
  size?: number;
}) {
  await requireAbility("notifications.view-all");

  const conditions: SQL[] = [];
  if (filter?.status) conditions.push(eq(notificationLog.status, filter.status));
  if (filter?.template) conditions.push(eq(notificationLog.templateKey, filter.template));
  if (filter?.q && filter.q.trim()) {
    conditions.push(ilike(notificationLog.recipientPhone, `%${filter.q.trim()}%`));
  }

  const range: NotificationRange = filter?.range ?? "7d";
  const start = rangeStart(range);
  if (start) conditions.push(gte(notificationLog.createdAt, start));

  const sortKey: NotificationSortKey = filter?.sort ?? "createdAt";
  const sortCol = NOTIF_SORT_COLUMNS[sortKey];
  const dir = filter?.dir ?? (sortKey === "createdAt" ? "desc" : "asc");
  const sortFn = dir === "desc" ? desc : asc;

  const size = Math.max(1, Math.min(200, filter?.size ?? 50));
  const page = Math.max(1, filter?.page ?? 1);
  const offset = (page - 1) * size;

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rowsQuery = db.select().from(notificationLog).$dynamic();
  const countQuery = db.select({ n: count() }).from(notificationLog).$dynamic();
  if (whereClause) {
    rowsQuery.where(whereClause);
    countQuery.where(whereClause);
  }

  const [rows, totalRow] = await Promise.all([
    rowsQuery.orderBy(sortFn(sortCol)).limit(size).offset(offset),
    countQuery,
  ]);

  return { rows, total: totalRow[0]?.n ?? 0, range };
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

