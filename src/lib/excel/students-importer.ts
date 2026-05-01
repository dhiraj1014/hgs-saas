import { eq } from "drizzle-orm";
import { type DB } from "@/lib/db";
import { student, parent, parentStudent } from "@/lib/db/schema/people";

export type RawRow = {
  admission_no?: string | number;
  first_name?: string;
  last_name?: string;
  dob?: string;
  gender?: string;
  section?: string;
  blood_group?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_relation?: string;
};

export type ValidatedRow = {
  rowIndex: number;
  student: {
    admissionNo: string; firstName: string; lastName: string;
    dob?: string; gender?: string; bloodGroup?: string; address?: string;
    currentSectionId?: string;
  };
  parent?: { fullName: string; phone: string; email?: string; relationToStudent?: string; isPrimaryContact: true };
};

export type ValidationError = { rowIndex: number; field: string; message: string };

export type ValidationResult = { valid: ValidatedRow[]; errors: ValidationError[] };

const PHONE_RE = /^\+?\d{10,15}$/;

export function validateStudentRows(
  rows: RawRow[],
  ctx: { knownSections: Map<string, string> }
): ValidationResult {
  const errors: ValidationError[] = [];
  const valid: ValidatedRow[] = [];
  const seenAdmission = new Set<string>();

  rows.forEach((row, i) => {
    const idx = i + 2;
    const required: Array<keyof RawRow> = ["admission_no", "first_name", "last_name"];
    const missing = required.filter((f) => row[f] === undefined || row[f] === "");
    if (missing.length > 0) {
      errors.push({ rowIndex: idx, field: missing[0]!, message: `Missing required field: ${missing.join(", ")}` });
      return;
    }
    const admNo = String(row.admission_no);
    if (seenAdmission.has(admNo)) {
      errors.push({ rowIndex: idx, field: "admission_no", message: `Duplicate admission_no in upload: ${admNo}` });
      return;
    }
    seenAdmission.add(admNo);

    let sectionId: string | undefined;
    if (row.section) {
      sectionId = ctx.knownSections.get(row.section);
      if (!sectionId) {
        errors.push({ rowIndex: idx, field: "section", message: `Unknown section: ${row.section}. Create it first.` });
        return;
      }
    }

    let parent: ValidatedRow["parent"];
    if (row.parent_phone || row.parent_name) {
      if (!row.parent_phone || !PHONE_RE.test(row.parent_phone)) {
        errors.push({ rowIndex: idx, field: "parent_phone", message: `Invalid phone: ${row.parent_phone ?? "(missing)"}` });
        return;
      }
      if (!row.parent_name) {
        errors.push({ rowIndex: idx, field: "parent_name", message: "parent_name required when parent_phone present" });
        return;
      }
      parent = {
        fullName: row.parent_name,
        phone: row.parent_phone,
        email: row.parent_email || undefined,
        relationToStudent: row.parent_relation,
        isPrimaryContact: true,
      };
    }

    valid.push({
      rowIndex: idx,
      student: {
        admissionNo: admNo,
        firstName: String(row.first_name),
        lastName: String(row.last_name),
        dob: row.dob,
        gender: row.gender,
        bloodGroup: row.blood_group,
        address: row.address,
        currentSectionId: sectionId,
      },
      parent,
    });
  });

  return { valid, errors };
}

export async function commitStudentRows(db: DB, rows: ValidatedRow[]) {
  let inserted = 0;
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const [s] = await tx.insert(student).values(row.student).returning();
      if (!s) throw new Error("Insert failed");
      if (row.parent) {
        let parentRow = (await tx.select().from(parent).where(eq(parent.phone, row.parent.phone)).limit(1))[0];
        if (!parentRow) {
          [parentRow] = await tx.insert(parent).values({
            fullName: row.parent.fullName,
            phone: row.parent.phone,
            email: row.parent.email ?? null,
            relationToStudent: row.parent.relationToStudent ?? null,
          }).returning();
        }
        await tx.insert(parentStudent).values({
          parentId: parentRow!.id,
          studentId: s.id,
          isPrimaryContact: row.parent.isPrimaryContact,
        });
      }
      inserted++;
    }
  });
  return { inserted };
}
