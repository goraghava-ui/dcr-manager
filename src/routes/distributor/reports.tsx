import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { exportFilmPL } from "../../lib/excel-export";
import { Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";
import { useToast } from "../../hooks/useToast";

const NETWORK_SHORT = [
  { name: "Sandhya 70mm", cum: 1240500 },
  { name: "Devi 70mm", cum: 1098200 },
  { name: "Sudarshan 35mm", cum: 812400 },
  { name: "Sri Ramakrishna", cum: 584800 },
  { name: "Venkateshwara", cum: 611000 },
  { name: "Murali 70mm", cum: 478000 },
];

const REPORTS = [
  { id: "pl", name: "Film P&L", desc: "Gross → distributor → theatre", pin: true, icon: "chart" },
  { id: "gst", name: "GST summary", desc: "CGST + SGST, period-wise (filing-ready)", pin: true, icon: "receipt" },
  { id: "channel", name: "Channel split", desc: "BMS vs District vs Counter", icon: "grid" },
  { id: "defaulter", name: "Defaulter report", desc: "Theatres with pending submissions", icon: "alert" },
  { id: "aging", name: "Settlement aging", desc: "Outstanding amounts, days overdue", icon: "clock" },
  { id: "ranking", name: "Theatre ranking", desc: "Comparative performance", icon: "chart" },
  { id: "expense", name: "Expense register", desc: "Category-wise, monthly", icon: "download" },
  { id: "audit", name: "Audit log", desc: "Who did what when", icon: "eye" },
];

export default function ReportsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeReport, setActiveReport] = useState("pl");
  const contentRef = useRef<HTMLDivElement>(null);

  function handleNav(id: string) {
    if (id === "dash") navigate("/distributor");
    if (id === "sett") navigate("/distributor/settlements");
    if (id === "rep") navigate("/distributor/reports");
  }

  function handleReportClick(id: string) {
    if (id === "gst") {
      navigate("/reports/gst");
      return;
    }
    setActiveReport(id);
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleExport() {
    exportFilmPL({
      filmName: "Jungle", territory: "Nizam", period: "Week1",
      theatres: NETWORK_SHORT.map(t => ({
        name: t.name, tickets: Math.round(t.cum / 180),
        grossPaise: t.cum * 100, gstPaise: Math.round(t.cum * 0.18 / 1.18) * 100,
        netPaise: Math.round(t.cum * 0.78) * 100, distSharePaise: Math.round(t.cum * 0.39) * 100,
        theatreSharePaise: Math.round(t.cum * 0.39) * 100,
      })),
    });
    toast.success("Excel exported — Jungle_PL_Week1.xlsx");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="rep" onNav={handleNav} role="distributor" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader
          title="Reports"
          sub="Filter, drill, export. Filing-ready GST and audit-friendly logs."
          breadcrumb={["Reports", "Library"]}
          actions={<>
            <button className="btn btn-primary btn-sm" onClick={handleExport}><Icon name="download" size={13} /> Export Excel</button>
          </>}
        />
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Report cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {REPORTS.map(r => (
              <div key={r.id} className="app-card" onClick={() => handleReportClick(r.id)}
                style={{
                  padding: 14, display: "flex", flexDirection: "column", gap: 6, cursor: "pointer",
                  borderColor: activeReport === r.id ? "var(--accent)" : "var(--line)",
                  boxShadow: activeReport === r.id ? "0 0 0 2px var(--accent-soft)" : "var(--shadow-sm)",
                }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Icon name={r.icon} size={16} color={activeReport === r.id ? "var(--accent)" : "var(--ink-3)"} />
                  {r.pin && <span style={{ fontSize: 10, color: "var(--ink-3)" }}>★ Pinned</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {/* Report Content */}
          <div ref={contentRef}>
            {activeReport === "pl" && <FilmPLReport />}
            {activeReport === "channel" && <ChannelSplitReport />}
            {activeReport === "defaulter" && <DefaulterReport />}
            {activeReport === "aging" && <SettlementAgingReport />}
            {activeReport === "ranking" && <TheatreRankingReport />}
            {activeReport === "expense" && <ExpenseReport />}
            {activeReport === "audit" && <AuditLogReport />}
          </div>
        </div>
      </main>
    </div>
  );
}

function FilmPLReport() {
  return (
    <div className="app-card">
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Film P&L · Jungle</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Day 1–7 · Nizam territory · 6 theatres</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr" }}>
        <table className="tbl">
          <thead><tr><th>Theatre</th><th className="num">Tix</th><th className="num">Gross</th><th className="num">Net</th><th className="num">Dist. share</th><th className="num">Theatre share</th></tr></thead>
          <tbody>
            {NETWORK_SHORT.map(t => (
              <tr key={t.name}>
                <td>{t.name}</td>
                <td className="num">{fmtQty(Math.round(t.cum / 180))}</td>
                <td className="num">{fmtINR(t.cum)}</td>
                <td className="num">{fmtINR(Math.round(t.cum * 0.78))}</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmtINR(Math.round(t.cum * 0.39))}</td>
                <td className="num">{fmtINR(Math.round(t.cum * 0.39))}</td>
              </tr>
            ))}
            <tr style={{ background: "var(--bg-soft)" }}>
              <td style={{ fontWeight: 700 }}>Total</td>
              <td className="num" style={{ fontWeight: 700 }}>{fmtQty(NETWORK_SHORT.reduce((a, t) => a + Math.round(t.cum / 180), 0))}</td>
              <td className="num" style={{ fontWeight: 700 }}>{fmtINR(NETWORK_SHORT.reduce((a, t) => a + t.cum, 0))}</td>
              <td className="num" style={{ fontWeight: 700 }}>{fmtINR(NETWORK_SHORT.reduce((a, t) => a + Math.round(t.cum * 0.78), 0))}</td>
              <td className="num" style={{ fontWeight: 700 }}>{fmtINR(NETWORK_SHORT.reduce((a, t) => a + Math.round(t.cum * 0.39), 0))}</td>
              <td className="num" style={{ fontWeight: 700 }}>{fmtINR(NETWORK_SHORT.reduce((a, t) => a + Math.round(t.cum * 0.39), 0))}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ borderLeft: "1px solid var(--line)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="label">Channel revenue split</div>
          <Donut />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
            <DonutLeg c="var(--accent)" label="BMS" pctVal="34%" amt="₹28.6 L" />
            <DonutLeg c="#1e6fbb" label="District" pctVal="18%" amt="₹15.1 L" />
            <DonutLeg c="var(--ok)" label="Counter" pctVal="46%" amt="₹38.7 L" />
            <DonutLeg c="var(--ink-4)" label="Comp" pctVal="2%" amt="—" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelSplitReport() {
  const channels = [
    { name: "BMS (BookMyShow)", qty: 8420, pct: 34, amount: 2860000, color: "var(--accent)" },
    { name: "District App", qty: 4460, pct: 18, amount: 1510000, color: "#1e6fbb" },
    { name: "Counter (Cash/UPI)", qty: 11380, pct: 46, amount: 3870000, color: "var(--ok)" },
    { name: "Complimentary", qty: 490, pct: 2, amount: 0, color: "var(--ink-4)" },
  ];
  return (
    <div className="app-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Channel Split · Jungle · Week 1</div>
      <table className="tbl">
        <thead><tr><th>Channel</th><th className="num">Tickets</th><th className="num">%</th><th className="num">Revenue</th></tr></thead>
        <tbody>{channels.map(c => (
          <tr key={c.name}>
            <td><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: c.color, marginRight: 8 }} />{c.name}</td>
            <td className="num">{fmtQty(c.qty)}</td>
            <td className="num">{c.pct}%</td>
            <td className="num" style={{ fontWeight: 600 }}>{c.amount > 0 ? fmtINR(c.amount) : "—"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function DefaulterReport() {
  const defaulters = [
    { theatre: "Laxmi Talkies", city: "Warangal", lastCdr: "8 May", daysMissed: 2, rep: "Venkat K." },
    { theatre: "Priya Complex", city: "Karimnagar", lastCdr: "9 May", daysMissed: 1, rep: "Raju M." },
  ];
  return (
    <div className="app-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Defaulter Report · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
      {defaulters.length === 0 ? <div style={{ padding: 16, color: "var(--ink-3)", fontSize: 13, textAlign: "center" }}>All theatres up to date ✓</div> :
      <table className="tbl">
        <thead><tr><th>Theatre</th><th>City</th><th>Last CDR</th><th className="num">Days missed</th><th>Rep</th></tr></thead>
        <tbody>{defaulters.map(d => (
          <tr key={d.theatre}>
            <td style={{ fontWeight: 600 }}>{d.theatre}</td>
            <td>{d.city}</td><td>{d.lastCdr}</td>
            <td className="num"><span style={{ color: "var(--bad)", fontWeight: 600 }}>{d.daysMissed}</span></td>
            <td>{d.rep}</td>
          </tr>
        ))}</tbody>
      </table>}
    </div>
  );
}

function SettlementAgingReport() {
  const aging = [
    { theatre: "Sandhya 70mm", amount: 483795, weeks: "W1", status: "paid", dueDate: "5 May" },
    { theatre: "Devi 70mm", amount: 428298, weeks: "W1", status: "sent", dueDate: "6 May" },
    { theatre: "Sudarshan 35mm", amount: 316836, weeks: "W1", status: "overdue", dueDate: "4 May" },
  ];
  return (
    <div className="app-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Settlement Aging</div>
      <table className="tbl">
        <thead><tr><th>Theatre</th><th>Period</th><th className="num">Amount</th><th>Due date</th><th>Status</th></tr></thead>
        <tbody>{aging.map(a => (
          <tr key={a.theatre}>
            <td style={{ fontWeight: 600 }}>{a.theatre}</td><td>{a.weeks}</td>
            <td className="num" style={{ fontWeight: 600 }}>{fmtINR(a.amount)}</td>
            <td>{a.dueDate}</td>
            <td><span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 500,
              background: a.status === "paid" ? "var(--ok-soft)" : a.status === "overdue" ? "var(--bad-soft)" : "var(--warn-soft)",
              color: a.status === "paid" ? "var(--ok)" : a.status === "overdue" ? "var(--bad)" : "var(--warn)",
            }}>{a.status}</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function TheatreRankingReport() {
  const ranked = NETWORK_SHORT.sort((a, b) => b.cum - a.cum).map((t, i) => ({ ...t, rank: i + 1 }));
  return (
    <div className="app-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Theatre Ranking · Jungle · Week 1</div>
      <table className="tbl">
        <thead><tr><th>#</th><th>Theatre</th><th className="num">Gross</th><th className="num">Bar</th></tr></thead>
        <tbody>{ranked.map(t => (
          <tr key={t.name}>
            <td style={{ fontWeight: 700, color: t.rank <= 3 ? "var(--accent)" : "var(--ink-3)" }}>{t.rank}</td>
            <td style={{ fontWeight: 600 }}>{t.name}</td>
            <td className="num" style={{ fontWeight: 600 }}>{fmtINR(t.cum)}</td>
            <td style={{ width: 200 }}><div style={{ height: 8, borderRadius: 4, background: "var(--accent-soft)", overflow: "hidden" }}><div style={{ height: "100%", width: `${(t.cum / ranked[0].cum) * 100}%`, background: "var(--accent)", borderRadius: 4 }} /></div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function ExpenseReport() {
  const cats = [
    { name: "Staff salary", amount: 208600 }, { name: "Electricity", amount: 45480 },
    { name: "Snacks/canteen", amount: 75880 }, { name: "Cleaning", amount: 18200 },
    { name: "Maintenance", amount: 31100 },
  ];
  const total = cats.reduce((a, c) => a + c.amount, 0);
  return (
    <div className="app-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Expense Register · May 2026</div>
      <table className="tbl">
        <thead><tr><th>Category</th><th className="num">Amount</th><th className="num">%</th></tr></thead>
        <tbody>
          {cats.map(c => (
            <tr key={c.name}><td>{c.name}</td><td className="num" style={{ fontWeight: 600 }}>{fmtINR(c.amount)}</td><td className="num">{Math.round(c.amount / total * 100)}%</td></tr>
          ))}
          <tr style={{ background: "var(--bg-soft)" }}><td style={{ fontWeight: 700 }}>Total</td><td className="num" style={{ fontWeight: 700 }}>{fmtINR(total)}</td><td className="num">100%</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function AuditLogReport() {
  const logs = [
    { ts: "11 May 14:32", user: "Suresh K.", action: "approve", table: "cdrs", detail: "Show #1 approved — 4 tix, ₹630" },
    { ts: "11 May 11:45", user: "Ramesh K.", action: "create", table: "cdrs", detail: "Show #1 submitted — 4 tix, ₹630" },
    { ts: "10 May 22:10", user: "Admin", action: "update", table: "theatre_pricing", detail: "Premium: ₹230 → ₹250" },
  ];
  return (
    <div className="app-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Audit Log</div>
      <table className="tbl">
        <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Table</th><th>Detail</th></tr></thead>
        <tbody>{logs.map((l, i) => (
          <tr key={i}>
            <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{l.ts}</td>
            <td>{l.user}</td>
            <td><span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
              background: l.action === "create" ? "var(--ok-soft)" : l.action === "approve" ? "var(--accent-soft)" : "var(--warn-soft)",
              color: l.action === "create" ? "var(--ok)" : l.action === "approve" ? "var(--accent)" : "var(--warn)",
            }}>{l.action}</span></td>
            <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{l.table}</td>
            <td style={{ fontSize: 12 }}>{l.detail}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}


function Donut() {
  const segs = [{ c: "var(--accent)", v: 34 }, { c: "#1e6fbb", v: 18 }, { c: "var(--ok)", v: 46 }, { c: "var(--ink-4)", v: 2 }];
  const C = 2 * Math.PI * 40; let off = 0;
  return (
    <svg width="160" height="160" viewBox="0 0 100 100" style={{ alignSelf: "center" }}>
      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-soft)" strokeWidth="14" />
      {segs.map((s, i) => { const len = (s.v / 100) * C; const dash = `${len} ${C - len}`; const el = <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={s.c} strokeWidth="14" strokeDasharray={dash} strokeDashoffset={-off} transform="rotate(-90 50 50)" />; off += len; return el; })}
      <text x="50" y="48" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ink-1)">₹84.2 L</text>
      <text x="50" y="60" textAnchor="middle" fontSize="6" fill="var(--ink-3)">CUM. GROSS</text>
    </svg>
  );
}

function DonutLeg({ c, label, pctVal, amt }: { c: string; label: string; pctVal: string; amt: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ color: "var(--ink-3)" }}>{pctVal}</span>
      <span className="tnum" style={{ fontWeight: 500, width: 60, textAlign: "right" }}>{amt}</span>
    </div>
  );
}
