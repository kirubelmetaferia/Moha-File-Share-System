import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/kirubel/Desktop/Moha-File-Share-System/outputs/019ff6a8-a29b-7d21-8d3d-d04a8990c8be";
const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Users");

const rows = [
  ["Full Name", "Email", "Department", "Role", "Password", "Status"],
  ["Aster Bekele", "aster.bekele.test@example.com", "Finance", "User", "AsterTest!2026", "Active"],
  ["Dawit Tesfaye", "dawit.tesfaye.test@example.com", "Operations", "User", "DawitTest!2026", "Active"],
  ["Mekdes Alemu", "mekdes.alemu.test@example.com", "Human Resources", "User", "MekdesTest!2026", "Active"],
  ["Samuel Fikru", "samuel.fikru.test@example.com", "Information Technology", "User", "SamuelTest!2026", "Active"],
  ["Selamawit Girma", "selamawit.girma.test@example.com", "Customer Service", "User", "SelamTest!2026", "Inactive"],
];

sheet.getRange("A1:F6").values = rows;
sheet.getRange("A1:F1").format = {
  fill: "#1E3A5F",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange("A2:F6").format = {
  verticalAlignment: "center",
  borders: { preset: "insideHorizontal", style: "thin", color: "#D9E2F3" },
};
sheet.getRange("A1:F6").format.borders = { preset: "outside", style: "thin", color: "#9FBAD0" };
sheet.getRange("A2:A6").format.font = { color: "#1F2937" };
sheet.getRange("D2:D50").dataValidation = { rule: { type: "list", values: ["User"] } };
sheet.getRange("F2:F50").dataValidation = { rule: { type: "list", values: ["Active", "Inactive"] } };

sheet.getRange("A1").format.rowHeight = 24;
sheet.getRange("A:F").format.autofitColumns();
sheet.getRange("A:A").format.columnWidth = 24;
sheet.getRange("B:B").format.columnWidth = 36;
sheet.getRange("C:C").format.columnWidth = 25;
sheet.getRange("D:D").format.columnWidth = 14;
sheet.getRange("E:E").format.columnWidth = 20;
sheet.getRange("F:F").format.columnWidth = 14;
sheet.freezePanes.freezeRows(1);
sheet.showGridLines = false;

const table = sheet.tables.add("A1:F6", true, "UsersImportTable");
table.style = "TableStyleMedium2";

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/users-import-test.xlsx`);

const preview = await workbook.render({
  sheetName: "Users",
  range: "A1:F6",
  scale: 1.5,
  format: "png",
});
await fs.writeFile(`${outputDir}/users-import-preview.png`, new Uint8Array(await preview.arrayBuffer()));

const check = await workbook.inspect({
  kind: "table",
  range: "Users!A1:F6",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 8,
});
console.log(check.ndjson);
