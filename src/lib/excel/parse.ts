import * as XLSX from "xlsx";

export type ParsedRow = Record<string, string | number | undefined>;

export function parseWorkbook(buffer: ArrayBuffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: undefined, raw: false });
}
