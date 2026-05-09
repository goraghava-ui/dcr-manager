/**
 * Excel Export Utility
 * 
 * Uses SheetJS (xlsx) to generate .xlsx files client-side.
 * Formats numbers in Indian locale, currency in ₹, dates as DD MMM YYYY.
 * 
 * Usage:
 *   import { exportToExcel } from './excel-export';
 *   exportToExcel({ sheets: [...], filename: 'report.xlsx' });
 */

interface SheetData {
  name: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  columnWidths?: number[];
}

interface ExportOptions {
  sheets: SheetData[];
  filename: string;
}

/** Load SheetJS from CDN dynamically */
async function loadXLSX(): Promise<any> {
  if ((window as any).XLSX) return (window as any).XLSX;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error("Failed to load SheetJS"));
    document.head.appendChild(script);
  });
}

/** Export data to Excel file */
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  for (const sheet of options.sheets) {
    const data = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    if (sheet.columnWidths) {
      ws["!cols"] = sheet.columnWidths.map((w) => ({ wch: w }));
    } else {
      // Auto-width from header lengths
      ws["!cols"] = sheet.headers.map((h) => ({
        wch: Math.max(h.length + 2, 12),
      }));
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  XLSX.writeFile(wb, options.filename);
}

/** Format paise to rupees string for Excel */
export function paiseToRupeesStr(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** Export Film P&L report */
export async function exportFilmPL(data: {
  filmName: string;
  territory: string;
  period: string;
  theatres: Array<{
    name: string;
    tickets: number;
    grossPaise: number;
    gstPaise: number;
    netPaise: number;
    distSharePaise: number;
    theatreSharePaise: number;
  }>;
}): Promise<void> {
  const rows = data.theatres.map((t) => [
    t.name,
    t.tickets,
    Number(paiseToRupeesStr(t.grossPaise)),
    Number(paiseToRupeesStr(t.gstPaise)),
    Number(paiseToRupeesStr(t.netPaise)),
    Number(paiseToRupeesStr(t.distSharePaise)),
    Number(paiseToRupeesStr(t.theatreSharePaise)),
  ]);

  // Add totals row
  const totals = data.theatres.reduce(
    (a, t) => ({
      tickets: a.tickets + t.tickets,
      gross: a.gross + t.grossPaise,
      gst: a.gst + t.gstPaise,
      net: a.net + t.netPaise,
      dist: a.dist + t.distSharePaise,
      theatre: a.theatre + t.theatreSharePaise,
    }),
    { tickets: 0, gross: 0, gst: 0, net: 0, dist: 0, theatre: 0 }
  );

  rows.push([
    "TOTAL",
    totals.tickets,
    Number(paiseToRupeesStr(totals.gross)),
    Number(paiseToRupeesStr(totals.gst)),
    Number(paiseToRupeesStr(totals.net)),
    Number(paiseToRupeesStr(totals.dist)),
    Number(paiseToRupeesStr(totals.theatre)),
  ]);

  await exportToExcel({
    filename: `${data.filmName}_PL_${data.period}.xlsx`,
    sheets: [
      {
        name: "Film P&L",
        headers: [
          "Theatre",
          "Tickets",
          "Gross (₹)",
          "GST (₹)",
          "Net (₹)",
          "Dist. Share (₹)",
          "Theatre Share (₹)",
        ],
        rows,
        columnWidths: [22, 10, 14, 14, 14, 14, 14],
      },
    ],
  });
}

/** Export GST Summary (filing-ready) */
export async function exportGSTSummary(data: {
  period: string;
  entries: Array<{
    date: string;
    theatre: string;
    grossPaise: number;
    gstRate: number;
    taxablePaise: number;
    cgstPaise: number;
    sgstPaise: number;
    totalGstPaise: number;
  }>;
}): Promise<void> {
  const rows = data.entries.map((e) => [
    e.date,
    e.theatre,
    Number(paiseToRupeesStr(e.grossPaise)),
    `${(e.gstRate * 100).toFixed(0)}%`,
    Number(paiseToRupeesStr(e.taxablePaise)),
    Number(paiseToRupeesStr(e.cgstPaise)),
    Number(paiseToRupeesStr(e.sgstPaise)),
    Number(paiseToRupeesStr(e.totalGstPaise)),
  ]);

  await exportToExcel({
    filename: `GST_Summary_${data.period}.xlsx`,
    sheets: [
      {
        name: "GST Summary",
        headers: [
          "Date",
          "Theatre",
          "Gross (₹)",
          "GST Rate",
          "Taxable (₹)",
          "CGST (₹)",
          "SGST (₹)",
          "Total GST (₹)",
        ],
        rows,
        columnWidths: [12, 22, 14, 10, 14, 12, 12, 14],
      },
    ],
  });
}

/** Export Expense Register */
export async function exportExpenseRegister(data: {
  theatre: string;
  period: string;
  expenses: Array<{
    date: string;
    category: string;
    payee: string;
    amountPaise: number;
    mode: string;
    note: string;
  }>;
}): Promise<void> {
  const rows = data.expenses.map((e) => [
    e.date,
    e.category,
    e.payee,
    Number(paiseToRupeesStr(e.amountPaise)),
    e.mode,
    e.note || "",
  ]);

  await exportToExcel({
    filename: `Expenses_${data.theatre}_${data.period}.xlsx`,
    sheets: [
      {
        name: "Expenses",
        headers: ["Date", "Category", "Paid to", "Amount (₹)", "Mode", "Note"],
        rows,
        columnWidths: [12, 16, 22, 14, 10, 30],
      },
    ],
  });
}

/** Export Settlement Statement */
export async function exportSettlement(data: {
  settlementNo: string;
  days: Array<{
    date: string;
    tickets: number;
    grossPaise: number;
    gstPaise: number;
    netPaise: number;
    sharePaise: number;
  }>;
  deductions: Record<string, number>;
  finalPaise: number;
}): Promise<void> {
  const rows = data.days.map((d) => [
    d.date,
    d.tickets,
    Number(paiseToRupeesStr(d.grossPaise)),
    Number(paiseToRupeesStr(d.gstPaise)),
    Number(paiseToRupeesStr(d.netPaise)),
    Number(paiseToRupeesStr(d.sharePaise)),
  ]);

  // Deductions sheet
  const dedRows = Object.entries(data.deductions).map(([k, v]) => [
    k,
    Number(paiseToRupeesStr(v)),
  ]);
  dedRows.push(["NET PAYABLE", Number(paiseToRupeesStr(data.finalPaise))]);

  await exportToExcel({
    filename: `Settlement_${data.settlementNo}.xlsx`,
    sheets: [
      {
        name: "Day-wise",
        headers: [
          "Date",
          "Tickets",
          "Gross (₹)",
          "GST (₹)",
          "Net (₹)",
          "Share (₹)",
        ],
        rows,
        columnWidths: [12, 10, 14, 14, 14, 14],
      },
      {
        name: "Deductions",
        headers: ["Item", "Amount (₹)"],
        rows: dedRows,
        columnWidths: [30, 14],
      },
    ],
  });
}
