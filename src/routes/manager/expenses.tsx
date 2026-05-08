import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fmtINR } from "../../lib/formatting";
import { LogoLockup, Icon } from "../../components/ui/shared";

const EXPENSES = [
  { id: 1, date: "5 May", cat: "Electricity", payee: "TSSPDCL", amt: 24500, mode: "bank" },
  { id: 2, date: "5 May", cat: "Cleaning", payee: "Saraswati Servs.", amt: 3200, mode: "upi" },
  { id: 3, date: "5 May", cat: "Snacks/canteen", payee: "Anand Suppliers", amt: 8400, mode: "cash" },
  { id: 4, date: "4 May", cat: "Staff salary", payee: "Day staff (12)", amt: 38400, mode: "cash" },
  { id: 5, date: "4 May", cat: "Maintenance", payee: "AC Service Co.", amt: 7100, mode: "bank" },
  { id: 6, date: "3 May", cat: "Electricity", payee: "TSSPDCL", amt: 6800, mode: "bank" },
  { id: 7, date: "3 May", cat: "Custom", payee: "Print mat. – posters", amt: 1900, mode: "upi" },
];

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState("all");
  const cats = ["all", "Electricity", "Cleaning", "Staff", "Snacks", "Maint."];
  const visible = active === "all" ? EXPENSES : EXPENSES.filter(e => e.cat.startsWith(active));
  const monthTotal = Math.round(EXPENSES.reduce((a, e) => a + e.amt, 0) * 4.2);

  const groups = visible.reduce<Record<string, typeof EXPENSES>>((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e); return acc;
  }, {});

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <LogoLockup small />
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/manager")} style={{ width: 30, padding: 0, justifyContent: "center" }}><Icon name="arrowL" size={16} /></button>
          <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 0, justifyContent: "center" }}><Icon name="search" size={16} /></button>
        </div>
      </div>

      {/* Title + month total */}
      <div style={{ padding: 16 }}>
        <div className="m-h1">Expenses</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>May 2026 · Sandhya 70mm</div>
        <div className="app-card" style={{ marginTop: 14, padding: 14 }}>
          <div className="m-label">Month-to-date</div>
          <div className="tnum" style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}>{fmtINR(monthTotal)}</div>
          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {[55, 12, 20, 8, 5].map((p, i) => (
              <div key={i} style={{ flex: p, height: 6, borderRadius: 2, background: ["var(--accent)", "#1e6fbb", "#b76b00", "#128a4d", "#9a9aa1"][i] }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>
            <span>Salary 55%</span><span>Elec 12%</span><span>Snacks 20%</span><span>Other 13%</span>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ padding: "0 16px", display: "flex", gap: 6, overflow: "auto" }}>
        {cats.map(c => (
          <div key={c} onClick={() => setActive(c)} style={{
            padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 500,
            border: "1px solid " + (active === c ? "var(--accent)" : "var(--line-2)"),
            background: active === c ? "var(--accent)" : "var(--surface)",
            color: active === c ? "#fff" : "var(--ink-2)",
            whiteSpace: "nowrap", cursor: "pointer",
          }}>{c === "all" ? "All" : c}</div>
        ))}
      </div>

      {/* Expense list grouped by date */}
      <div style={{ padding: "14px 16px 80px", display: "flex", flexDirection: "column", gap: 14 }}>
        {Object.entries(groups).map(([date, items]) => (
          <div key={date}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 4px 6px" }}>
              <span>{date} 2026</span>
              <span className="tnum">{fmtINR(items.reduce((a, e) => a + e.amt, 0))}</span>
            </div>
            <div className="app-card" style={{ overflow: "hidden" }}>
              {items.map((e, i) => (
                <div key={e.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: "var(--bg-soft)", color: "var(--ink-2)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0,
                  }}>{e.cat[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.cat}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{e.payee} · {e.mode.toUpperCase()}</div>
                  </div>
                  <div className="tnum" style={{ fontSize: 14, fontWeight: 600 }}>{fmtINR(e.amt)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating add button */}
      <button className="btn btn-primary" style={{
        position: "fixed", right: 16, bottom: 24, height: 48, padding: "0 18px",
        boxShadow: "0 6px 20px rgba(39,71,212,0.35)", fontSize: 14, zIndex: 10,
      }}>
        <Icon name="plus" size={16} /> Add expense
      </button>
    </div>
  );
}
