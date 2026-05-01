import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "./db";
import { attendance } from "./db/schema/communications";
import { parent, parentStudent, student } from "./db/schema/people";
import { section, class_ } from "./db/schema/academic";
import { notifier as defaultNotifier } from "./notifier";
import type { Notifier } from "./notifier/types";

export interface MarkAttendanceInput {
  sectionId: string;
  date: string;        // ISO date, YYYY-MM-DD
  markerId: string;
  entries: { studentId: string; status: "present" | "absent" | "late"; notes?: string }[];
}

export interface MarkAttendanceResult {
  marked: number;
  notified: number;
  failed: number;
  skipped: number;
}

export async function markAttendance(
  db: DB,
  input: MarkAttendanceInput,
  notifier: Notifier = defaultNotifier,
): Promise<MarkAttendanceResult> {
  const studentIds = input.entries.map((e) => e.studentId);
  if (studentIds.length === 0) return { marked: 0, notified: 0, failed: 0, skipped: 0 };

  // Read prior status per (student, date) before write so we can compute transitions
  const prior = await db
    .select({ studentId: attendance.studentId, status: attendance.status })
    .from(attendance)
    .where(and(eq(attendance.date, input.date), inArray(attendance.studentId, studentIds)));
  const priorMap = new Map(prior.map((p) => [p.studentId, p.status]));

  // Single transaction for the writes
  await db.transaction(async (tx) => {
    for (const e of input.entries) {
      await tx
        .insert(attendance)
        .values({
          studentId: e.studentId,
          sectionId: input.sectionId,
          date: input.date,
          status: e.status,
          markedBy: input.markerId,
          notes: e.notes,
        })
        .onConflictDoUpdate({
          target: [attendance.studentId, attendance.date],
          set: { status: e.status, markedBy: input.markerId, markedAt: new Date(), notes: e.notes ?? null },
        });
    }
  });

  // Compute newly absent or late
  const toNotify = input.entries.filter((e) => {
    if (e.status !== "absent" && e.status !== "late") return false;
    const previous = priorMap.get(e.studentId);
    return previous !== e.status;     // first mark, or status changed
  });

  if (toNotify.length === 0) {
    return { marked: input.entries.length, notified: 0, failed: 0, skipped: 0 };
  }

  // Look up student/section name + primary parent phone for each
  const ids = toNotify.map((e) => e.studentId);
  const studentRows = await db
    .select({
      id: student.id, firstName: student.firstName, lastName: student.lastName,
      sectionName: section.name, className: class_.name,
    })
    .from(student)
    .leftJoin(section, eq(section.id, student.currentSectionId))
    .leftJoin(class_, eq(class_.id, section.classId))
    .where(inArray(student.id, ids));
  const studentMap = new Map(studentRows.map((s) => [s.id, s]));

  const parentRows = await db
    .select({
      studentId: parentStudent.studentId,
      phone: parent.phone,
    })
    .from(parentStudent)
    .innerJoin(parent, eq(parent.id, parentStudent.parentId))
    .where(and(inArray(parentStudent.studentId, ids), eq(parentStudent.isPrimaryContact, true)));
  const parentPhoneMap = new Map(parentRows.map((p) => [p.studentId, p.phone]));

  let notified = 0, failed = 0, skipped = 0;
  for (const e of toNotify) {
    const phone = parentPhoneMap.get(e.studentId);
    if (!phone) { skipped++; continue; }
    const s = studentMap.get(e.studentId);
    const result = await notifier.sendAttendanceAlert(
      phone,
      {
        studentName: s ? `${s.firstName} ${s.lastName}`.trim() : "your child",
        date: formatDate(input.date),
        status: e.status as "absent" | "late",
        sectionName: s ? `${s.className ?? ""} · ${s.sectionName ?? ""}`.trim() : "",
      },
    );
    if (result.status === "sent" || result.status === "stub_sent") notified++;
    else failed++;
  }

  return { marked: input.entries.length, notified, failed, skipped };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d}-${months[Number(m) - 1]}-${y}`;
}
