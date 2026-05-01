import { describe, expect, it } from "vitest";
import { validateStudentRows, type RawRow } from "@/lib/excel/students-importer";

const valid: RawRow = {
  admission_no: "001", first_name: "Aarav", last_name: "Kumar",
  dob: "2014-06-12", gender: "M", section: "Grade 5 · A",
  parent_name: "Ravi Kumar", parent_phone: "+919999900001", parent_relation: "Father",
};

describe("validateStudentRows", () => {
  it("accepts a fully valid row", () => {
    const result = validateStudentRows([valid], { knownSections: new Map([["Grade 5 · A", "sec-1"]]) });
    expect(result.errors).toEqual([]);
    expect(result.valid.length).toBe(1);
    expect(result.valid[0].student.admissionNo).toBe("001");
  });

  it("rejects missing required fields", () => {
    const result = validateStudentRows([{ ...valid, admission_no: undefined }], { knownSections: new Map() });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toMatch(/admission_no/);
  });

  it("rejects unknown section", () => {
    const result = validateStudentRows([valid], { knownSections: new Map() });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toMatch(/section/i);
  });

  it("rejects malformed phone", () => {
    const result = validateStudentRows([{ ...valid, parent_phone: "12" }], { knownSections: new Map([["Grade 5 · A", "sec-1"]]) });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toMatch(/phone/i);
  });

  it("rejects duplicate admission_no within same upload", () => {
    const result = validateStudentRows([valid, valid], { knownSections: new Map([["Grade 5 · A", "sec-1"]]) });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toMatch(/duplicate/i);
  });
});
