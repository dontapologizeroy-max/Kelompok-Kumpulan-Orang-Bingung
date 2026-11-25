const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

function printableRows(summary) {
  return Object.entries(summary)
    .filter(([, value]) => !Array.isArray(value) && value !== undefined)
    .map(([key, value]) => [key, value === null ? "" : String(value)]);
}

function createPdf(title, summary, tableRows = [], peakHourRows = []) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 48, size: "A4" });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));

    document.fontSize(18).text(title, { continued: false });
    document.moveDown(0.7).fontSize(10);
    for (const [label, value] of printableRows(summary)) {
      document.text(`${label}: ${value}`);
    }
    if (tableRows.length) {
      document.moveDown().fontSize(13).text("Rincian Komputer");
      document.moveDown(0.4).fontSize(9);
      for (const row of tableRows) {
        document.text(`${row.pcCode} | ${row.pcName} | Sesi: ${row.sessionCount} | Menit: ${row.occupiedMinutes}`);
      }
    }
    if (peakHourRows.length) {
      document.moveDown().fontSize(13).text("Jam Sibuk (UTC)");
      document.moveDown(0.4).fontSize(9);
      for (const row of peakHourRows) {
        document.text(`${String(row.hourOfDay).padStart(2, "0")}:00 | Sesi: ${row.sessionCount} | Menit: ${row.occupiedMinutes}`);
      }
    }
    document.end();
  });
}

async function createExcel(title, summary, tableRows = [], peakHourRows = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Warnet Management";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Ringkasan");
  sheet.addRow([title]);
  sheet.mergeCells("A1:B1");
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.addRow(["Metrik", "Nilai"]);
  sheet.getRow(2).font = { bold: true };
  for (const row of printableRows(summary)) sheet.addRow(row);
  sheet.columns = [{ width: 28 }, { width: 36 }];

  if (tableRows.length) {
    const details = workbook.addWorksheet("Okupansi PC");
    details.columns = [
      { header: "ID Komputer", key: "computerId", width: 16 },
      { header: "Kode PC", key: "pcCode", width: 18 },
      { header: "Nama PC", key: "pcName", width: 28 },
      { header: "Jumlah Sesi", key: "sessionCount", width: 16 },
      { header: "Menit Terpakai", key: "occupiedMinutes", width: 18 }
    ];
    details.getRow(1).font = { bold: true };
    details.addRows(tableRows);
  }
  if (peakHourRows.length) {
    const peakHours = workbook.addWorksheet("Jam Sibuk");
    peakHours.columns = [
      { header: "Jam (UTC)", key: "hourOfDay", width: 16 },
      { header: "Jumlah Sesi", key: "sessionCount", width: 16 },
      { header: "Menit Terpakai", key: "occupiedMinutes", width: 18 }
    ];
    peakHours.getRow(1).font = { bold: true };
    peakHours.addRows(peakHourRows);
  }
  return workbook.xlsx.writeBuffer();
}

function exportRevenuePdf(summary) {
  return createPdf("Laporan Pendapatan", summary);
}

function exportRevenueExcel(summary) {
  return createExcel("Laporan Pendapatan", summary);
}

function exportOccupancyPdf(summary) {
  return createPdf("Laporan Okupansi PC", summary, summary.computers || [], summary.peakHours || []);
}

function exportOccupancyExcel(summary) {
  return createExcel("Laporan Okupansi PC", summary, summary.computers || [], summary.peakHours || []);
}

module.exports = {
  exportRevenuePdf,
  exportRevenueExcel,
  exportOccupancyPdf,
  exportOccupancyExcel
};