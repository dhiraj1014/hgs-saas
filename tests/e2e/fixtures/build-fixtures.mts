// Run once to regenerate the binary fixture:
//   pnpm tsx tests/e2e/fixtures/build-fixtures.mts
import * as XLSX from "xlsx";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rows = [
  { admission_no: "E2E001", first_name: "Anaya", last_name: "Test", section: "Grade 5 · A", parent_name: "Test Parent A", parent_phone: "+919999999991" },
  { admission_no: "E2E002", first_name: "Vivaan", last_name: "Test", section: "Grade 5 · A", parent_name: "Test Parent B", parent_phone: "+919999999992" },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
XLSX.writeFile(wb, path.join(__dirname, "students-2.xlsx"));
console.log("Wrote students-2.xlsx");
