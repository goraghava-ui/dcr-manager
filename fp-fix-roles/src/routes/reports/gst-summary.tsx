import { useState } from "react";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { exportGSTSummary } from "../../lib/excel-export";
import { Icon, SummaryRow } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

const GST_DATA = [
  { date: "28 Apr", theatre: "Sandhya 70mm", gross: 218400, rate18: 196200, rate12: 22200, gst18: 29935, gst12: 2379, cgst: 16157, sgst: 16157, total: 32314 },
  { date: "29 Apr", theatre: "Sandhya 70mm", gross: 243600, rate18: 219800, rate12: 23800, gst18: 33529, gst12: 2550, cgst: 18040, sgst: 18040, total: 36079 },
  { date: "30 Apr", theatre: "Sandhya 70mm", gross: 248600, rate18: 224200, rate12: 24400, gst18: 34200, gst12: 2614, cgst: 18407, sgst: 18407, total: 36814 },
  { date: "1 May", theatre: "Sandhya 70mm", gross: 276400, rate18: 249200, rate12: 27200, gst18: 38013, gst12: 2914, cgst: 20464, sgst: 20464, total: 40927 },
  { date: "2 May", theatre: "Sandhya 70mm", gross: 285600, rate18: 257600, rate12: 28000, gst18: 39295, gst12: 3000, cgst: 21148, sgst: 21148, total: 42295 },
  { date: "3 May", theatre: "Sandhya 70mm", gross: 272240, rate18: 245400, rate12: 26840, gst18: 37434, gst12: 2876, cgst: 20155, sgst: 20155, total: 40310 },
  { date: "4 May", theatre: "Sandhya 70mm", gross: 262400, rate18: 236600, rate12: 25800, gst18: 36100, gst12: 2764, cgst: 19432, sgst: 19432, total: 38864 },
];

export default function GSTSummaryPage() {
  const [period, setPeriod] = useState("week1");

  const totals = GST_DATA.reduce((a, d) => ({
    gross: a.gross + d.gross,
    rate18: a.rate18 + d.rate18,
    rate12: a.rate12 + d.rate12,
    gst18: a.gst18 + d.gst18,
    gst12: a.gst12 + d.gst12,
    cgst: a.cgst + d.cgst,
    sgst: a.sgst + d.sgst,
    total: a.total + d.total,
  }), { gross: 0, rate18: 0, rate12: 0, gst18: 0, gst12: 0, cgst: 0, sgst: 0, total: 0 });

  const handleExport = async () => {
    await exportGSTSummary({
      period: "28 Apr - 4 May 2026",
      entries: GST_DATA.map(d => ({
        date: d.date + " 2026",
        theatre: d.theatre,
        grossPaise: d.gross * 100,
        gstRate: 0.18,
        taxablePaise: Math.round(d.gross * 100 / 1.18),
        cgstPaise: d.cgst * 100,
        sgstPaise: d.sgst * 100,
        totalGstPaise: d.total * 100,
      })),
    });
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="rep" role="distributor" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader
          title="GST summary"
          sub="Filing-ready CGST + SGST breakdown. Download for your CA."
          breadcrumb={["Reports", "GST summary"]}
          actions={<>
            <select className="select" style={{ width: 160, height: 28, fontSize: 12 }} value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="week1">Week 1 (28 Apr – 4 May)</option>
              <option value="week2">Week 2 (5 May – 11 May)</option>
              <option value="mtd">Month-to-date</option>
            </select>
            <button className="btn btn-sm" onClick={handleExport}><Icon name="download" size={13} /> Export Excel</button>
          </>}
        />
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div className="metric">
              <div className="lbl">Total gross</div>
              <div className="val">{fmtINR(totals.gross)}</div>
              <div className="sub">GST-inclusive ticket revenue</div>
            </div>
            <div className="metric">
              <div className="lbl">Total GST collected</div>
              <div className="val">{fmtINR(totals.total)}</div>
              <div className="sub">CGST {fmtINR(totals.cgst)} + SGST {fmtINR(totals.sgst)}</div>
            </div>
            <div className="metric">
              <div className="lbl">18% slab (≥₹100)</div>
              <div className="val">{fmtINR(totals.gst18)}</div>
              <div className="sub">On revenue {fmtINR(totals.rate18)}</div>
            </div>
            <div className="metric">
              <div className="lbl">12% slab (&lt;₹100)</div>
              <div className="val">{fmtINR(totals.gst12)}</div>
              <div className="sub">On revenue {fmtINR(totals.rate12)}</div>
            </div>
          </div>

          {/* Filing summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>GSTR-1 output tax</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <SummaryRow label="Taxable value (18%)" value={fmtINR(Math.round(totals.rate18 / 1.18))} />
                <SummaryRow label="CGST @ 9%" value={fmtINR(Math.round(totals.gst18 / 2))} />
                <SummaryRow label="SGST @ 9%" value={fmtINR(Math.round(totals.gst18 / 2))} />
                <div className="div-h" style={{ margin: "4px 0" }} />
                <SummaryRow label="Taxable value (12%)" value={fmtINR(Math.round(totals.rate12 / 1.12))} />
                <SummaryRow label="CGST @ 6%" value={fmtINR(Math.round(totals.gst12 / 2))} />
                <SummaryRow label="SGST @ 6%" value={fmtINR(Math.round(totals.gst12 / 2))} />
                <div className="div-h" style={{ margin: "4px 0" }} />
                <SummaryRow label="Total tax liability" value={fmtINR(totals.total)} bold accent />
              </div>
            </div>
            <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>HSN-wise breakup</div>
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead><tr><th>HSN</th><th>Description</th><th className="num">Rate</th><th className="num">Taxable</th><th className="num">Tax</th></tr></thead>
                <tbody>
                  <tr>
                    <td style={{ fontFamily: "var(--font-mono)" }}>9996</td>
                    <td>Exhibition of film (≥₹100)</td>
                    <td className="num">18%</td>
                    <td className="num">{fmtINR(Math.round(totals.rate18 / 1.18))}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtINR(totals.gst18)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontFamily: "var(--font-mono)" }}>9996</td>
                    <td>Exhibition of film (&lt;₹100)</td>
                    <td className="num">12%</td>
                    <td className="num">{fmtINR(Math.round(totals.rate12 / 1.12))}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtINR(totals.gst12)}</td>
                  </tr>
                  <tr style={{ background: "var(--bg-soft)" }}>
                    <td colSpan={3} style={{ fontWeight: 600 }}>Total</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtINR(Math.round(totals.rate18 / 1.18 + totals.rate12 / 1.12))}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{fmtINR(totals.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Day-wise detail */}
          <div className="app-card">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Day-wise GST breakup</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Sandhya 70mm · 28 Apr – 4 May 2026</div>
              </div>
            </div>
            <table className="tbl">
              <thead><tr>
                <th>Date</th><th className="num">Gross</th>
                <th className="num">18% portion</th><th className="num">12% portion</th>
                <th className="num">CGST</th><th className="num">SGST</th><th className="num">Total GST</th>
              </tr></thead>
              <tbody>
                {GST_DATA.map(d => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td className="num">{fmtINR(d.gross)}</td>
                    <td className="num" style={{ color: "var(--ink-3)" }}>{fmtINR(d.gst18)}</td>
                    <td className="num" style={{ color: "var(--ink-3)" }}>{fmtINR(d.gst12)}</td>
                    <td className="num">{fmtINR(d.cgst)}</td>
                    <td className="num">{fmtINR(d.sgst)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtINR(d.total)}</td>
                  </tr>
                ))}
                <tr style={{ background: "var(--bg-soft)" }}>
                  <td style={{ fontWeight: 700 }}>Total</td>
                  <td className="num" style={{ fontWeight: 700 }}>{fmtINR(totals.gross)}</td>
                  <td className="num">{fmtINR(totals.gst18)}</td>
                  <td className="num">{fmtINR(totals.gst12)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmtINR(totals.cgst)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmtINR(totals.sgst)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{fmtINR(totals.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: 12, color: "var(--ink-3)", padding: "0 4px" }}>
            HSN code 9996 · Place of supply: Telangana (36) · Reverse charge: No · All amounts in ₹ · GST rates as per Notification No. 11/2017-CT(R)
          </div>
        </div>
      </main>
    </div>
  );
}
