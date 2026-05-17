import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { useUserContext } from "../../hooks/useUserContext";
import { useToast } from "../../hooks/useToast";
import { Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

const REPORTS = [
  { id: "pl", name: "Theatre P&L", desc: "Daily gross → GST → net → shares", icon: "chart" },
  { id: "gst", name: "GST summary", desc: "CGST + SGST filing-ready", icon: "receipt" },
  { id: "channel", name: "Channel split", desc: "BMS vs District vs Counter", icon: "grid" },
  { id: "expense", name: "Expense register", desc: "Category-wise, monthly", icon: "download" },
];

export default function ManagerReportsPage() {
  const navigate = useNavigate();
  const uc = useUserContext();
  const toast = useToast();
  const [active, setActive] = useState("pl");
  const [cdrs, setCdrs] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!uc.loading && uc.bookingId) loadData(); }, [uc.loading, uc.bookingId]);

  async function loadData() {
    setLoading(true);
    const [{ data: c }, { data: e }] = await Promise.all([
      (supabase as any).from("cdrs").select("*").eq("theatre_booking_id", uc.bookingId).in("status", ["approved", "submitted"]).order("show_date"),
      (supabase as any).from("expenses").select("*").eq("theatre_id", uc.theatreId).order("expense_date", { ascending: false }).limit(50),
    ]);
    setCdrs(c || []); setExpenses(e || []); setLoading(false);
  }

  function handleNav(id: string) {
    if (id === "dash") navigate("/manager");
    if (id === "cdrs") navigate("/manager/cdrs");
    if (id === "sheet") navigate("/manager/daily-sheet");
    if (id === "exp") navigate("/manager/expenses");
    if (id === "sett") navigate("/manager/settlements");
    if (id === "rep") navigate("/manager/reports");
  }

  const gross = cdrs.reduce((a: number, c: any) => a + c.gross_collection_paise, 0) / 100;
  const gst = cdrs.reduce((a: number, c: any) => a + c.gst_paise, 0) / 100;
  const net = cdrs.reduce((a: number, c: any) => a + c.net_collection_paise, 0) / 100;
  const tickets = cdrs.reduce((a: number, c: any) => a + c.total_qty, 0);
  const bms = cdrs.reduce((a: number, c: any) => a + (c.bms_qty || 0), 0);
  const dist = cdrs.reduce((a: number, c: any) => a + (c.district_qty || 0), 0);
  const counter = cdrs.reduce((a: number, c: any) => a + (c.counter_qty || 0), 0);
  const comp = cdrs.reduce((a: number, c: any) => a + (c.comp_qty || 0), 0);
  const expTotal = expenses.reduce((a: number, e: any) => a + e.amount_paise, 0) / 100;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="rep" onNav={handleNav} role="manager" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader title="Reports" sub={`${uc.theatreName || "Theatre"} · Manager view`} breadcrumb={["Manager", "Reports"]} />
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {REPORTS.map(r => (
              <div key={r.id} className="app-card" onClick={() => r.id === "gst" ? navigate("/reports/gst") : setActive(r.id)}
                style={{ padding: 12, cursor: "pointer", borderColor: active === r.id ? "var(--accent)" : "var(--line)" }}>
                <Icon name={r.icon} size={15} color={active === r.id ? "var(--accent)" : "var(--ink-3)"} />
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{r.name}</div>
                <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading...</div> :
          cdrs.length === 0 ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>No CDR data yet for this theatre.</div> :
          <>
            {active === "pl" && <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Theatre P&L · {uc.theatreName}</div>
              <table className="tbl"><thead><tr><th>Metric</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  <tr><td>Gross collection</td><td className="num" style={{ fontWeight: 600 }}>{fmtINR(gross)}</td></tr>
                  <tr><td>GST deducted</td><td className="num" style={{ color: "var(--bad)" }}>−{fmtINR(gst)}</td></tr>
                  <tr><td>Net collection</td><td className="num" style={{ fontWeight: 600 }}>{fmtINR(net)}</td></tr>
                  <tr><td>Distributor share ({uc.distributorSharePct}%)</td><td className="num">{fmtINR(Math.round(net * (uc.distributorSharePct || 50) / 100))}</td></tr>
                  <tr><td>Theatre share</td><td className="num" style={{ fontWeight: 600 }}>{fmtINR(Math.round(net * (100 - (uc.distributorSharePct || 50)) / 100))}</td></tr>
                  <tr><td>Expenses</td><td className="num" style={{ color: "var(--bad)" }}>−{fmtINR(expTotal)}</td></tr>
                  <tr style={{ background: "var(--bg-soft)" }}><td style={{ fontWeight: 700 }}>Net theatre profit</td><td className="num" style={{ fontWeight: 700 }}>{fmtINR(Math.round(net * (100 - (uc.distributorSharePct || 50)) / 100) - expTotal)}</td></tr>
                  <tr><td>Total tickets sold</td><td className="num">{fmtQty(tickets)}</td></tr>
                  <tr><td>Total CDRs</td><td className="num">{cdrs.length}</td></tr>
                </tbody>
              </table>
            </div>}

            {active === "channel" && <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Channel split · {uc.theatreName}</div>
              <table className="tbl"><thead><tr><th>Channel</th><th className="num">Tickets</th><th className="num">%</th></tr></thead>
                <tbody>
                  {[{ n: "BMS (BookMyShow)", v: bms, c: "var(--accent)" }, { n: "District app", v: dist, c: "#1e6fbb" }, { n: "Counter (cash/UPI)", v: counter, c: "var(--ok)" }, { n: "Complimentary", v: comp, c: "var(--ink-4)" }].map(ch => (
                    <tr key={ch.n}><td><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: ch.c, marginRight: 8 }} />{ch.n}</td><td className="num">{fmtQty(ch.v)}</td><td className="num">{tickets > 0 ? Math.round(ch.v / tickets * 100) : 0}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>}

            {active === "expense" && <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Expense register · Total: {fmtINR(expTotal)}</div>
              {expenses.length === 0 ? <div style={{ color: "var(--ink-3)", padding: 16, textAlign: "center" }}>No expenses recorded.</div> :
              <table className="tbl"><thead><tr><th>Date</th><th>Category</th><th>Paid to</th><th className="num">Amount</th></tr></thead>
                <tbody>{expenses.map((e: any) => (
                  <tr key={e.id}><td>{new Date(e.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td><td>{e.category}</td><td>{e.paid_to}</td><td className="num" style={{ fontWeight: 600 }}>{fmtINR(e.amount_paise / 100)}</td></tr>
                ))}</tbody>
              </table>}
            </div>}
          </>}
        </div>
      </main>
    </div>
  );
}
