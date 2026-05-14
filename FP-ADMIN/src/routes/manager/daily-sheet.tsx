import { useNavigate } from "react-router-dom";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { SummaryRow, Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

const SHOWS = [
  { id: 1, time: "11:00 AM", qty: 312, gross: 56240 },
  { id: 2, time: "02:30 PM", qty: 348, gross: 63100 },
  { id: 3, time: "06:30 PM", qty: 358, gross: 65620 },
  { id: 4, time: "10:00 PM", qty: 0, gross: 0 },
];

export default function DailySheetPage() {
  const navigate = useNavigate();
  const grossToday = SHOWS.reduce((a, s) => a + s.gross, 0);
  const qty = SHOWS.reduce((a, s) => a + s.qty, 0);
  const gst = Math.round(grossToday * 0.18 / 1.18);
  const bmsCom = Math.round(grossToday * 0.32 * 0.08);
  const distCom = Math.round(grossToday * 0.18 * 0.05);
  const net = grossToday - gst - bmsCom - distCom;
  const distShare = Math.round(net * 0.50);
  const maint = qty * 5;
  const distNet = distShare - maint;

  function handleNav(id: string) {
    if (id === "dash") navigate("/manager");
    if (id === "cdrs") navigate("/manager/cdrs");
    if (id === "sheet") navigate("/manager/daily-sheet");
    if (id === "exp") navigate("/manager/expenses");
    if (id === "sett") navigate("/manager/settlements");
    if (id === "rep") navigate("/manager/reports");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="sheet" onNav={handleNav} role="manager" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader
          title="Daily Sheet · 5 May 2026"
          sub="This is what gets sent to Friday Pictures (distributor). Submitting locks today's CDRs."
          breadcrumb={["Sandhya 70mm", "Daily Sheet", "5 May"]}
          actions={<>
            <button className="btn btn-sm" onClick={() => navigate("/manager")}><Icon name="arrowL" size={13} /> Back</button>
            <button className="btn btn-sm"><Icon name="print" size={13} /> Preview PDF</button>
            <button className="btn btn-primary btn-sm"><Icon name="lock" size={13} /> Submit & lock day</button>
          </>}
        />
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
          {/* Aggregated CDR table */}
          <div className="app-card">
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Daily Sheet · Aggregated CDRs</div>
            </div>
            <table className="tbl">
              <thead><tr><th>Show</th><th>Time</th><th className="num">Tix</th><th className="num">Gross</th><th className="num">GST</th><th className="num">Net</th></tr></thead>
              <tbody>
                {SHOWS.map(s => {
                  const g = s.gross;
                  const sgst = Math.round(g * 0.18 / 1.18);
                  return (
                    <tr key={s.id}>
                      <td>#{s.id}</td><td>{s.time}</td>
                      <td className="num">{s.qty || "—"}</td>
                      <td className="num">{g ? fmtINR(g) : "—"}</td>
                      <td className="num" style={{ color: "var(--ink-3)" }}>{g ? fmtINR(sgst) : "—"}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{g ? fmtINR(g - sgst) : "—"}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: "var(--bg-soft)" }}>
                  <td colSpan={2} style={{ fontWeight: 700 }}>Day total</td>
                  <td className="num" style={{ fontWeight: 700 }}>{fmtQty(qty)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{fmtINR(grossToday)}</td>
                  <td className="num">{fmtINR(gst)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{fmtINR(grossToday - gst)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Settlement preview + Theatre P&L */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Settlement preview</div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <SummaryRow label="Gross" value={fmtINR(grossToday)} />
                <SummaryRow label="GST (inclusive)" value={"− " + fmtINR(gst)} muted />
                <SummaryRow label="BMS commission" value={"− " + fmtINR(bmsCom)} muted />
                <SummaryRow label="District commission" value={"− " + fmtINR(distCom)} muted />
                <div className="div-h" style={{ margin: "4px 0" }} />
                <SummaryRow label="Net collection" value={fmtINR(net)} bold />
                <SummaryRow label="Distributor share (50%)" value={fmtINR(distShare)} />
                <SummaryRow label={`− Maintenance (₹5×${qty})`} value={"− " + fmtINR(maint)} muted />
                <div className="div-h" style={{ margin: "4px 0" }} />
                <SummaryRow label="Payable to distributor" value={fmtINR(distNet)} bold accent />
              </div>
            </div>
            <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Theatre P&L (internal)</div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <SummaryRow label="Theatre share" value={fmtINR(net - distShare)} />
                <SummaryRow label="Today's expenses" value={"− " + fmtINR(36100)} muted />
                <div className="div-h" style={{ margin: "4px 0" }} />
                <SummaryRow label="Net theatre profit" value={fmtINR(net - distShare - 36100)} bold />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
