import { useNavigate } from "react-router-dom";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { exportFilmPL } from "../../lib/excel-export";
import { Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

const NETWORK_SHORT = [
  { name: "Sandhya 70mm", cum: 1240500 },
  { name: "Devi 70mm", cum: 1098200 },
  { name: "Sudarshan 35mm", cum: 812400 },
  { name: "Sri Ramakrishna", cum: 584800 },
  { name: "Venkateshwara", cum: 611000 },
  { name: "Murali 70mm", cum: 478000 },
];

const REPORTS = [
  { name: "Film P&L", desc: "Gross → distributor → theatre", pin: true, path: "" },
  { name: "GST summary", desc: "CGST + SGST, period-wise (filing-ready)", pin: true, path: "/reports/gst" },
  { name: "Channel split", desc: "BMS vs District vs Counter", path: "" },
  { name: "Defaulter report", desc: "Theatres with pending submissions", path: "" },
  { name: "Settlement aging", desc: "Outstanding amounts, days overdue", path: "" },
  { name: "Theatre ranking", desc: "Comparative performance", path: "" },
  { name: "Expense register", desc: "Category-wise, monthly", path: "" },
  { name: "Audit log", desc: "Who did what when", path: "" },
];

export default function ReportsPage() {
  const navigate = useNavigate();

  function handleNav(id: string) {
    if (id === "dash") navigate("/distributor");
    if (id === "sett") navigate("/distributor/settlements");
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
            <button className="btn btn-sm"><Icon name="mail" size={13} /> Email</button>
            <button className="btn btn-primary btn-sm" onClick={() => exportFilmPL({
              filmName: "Jungle",
              territory: "Nizam",
              period: "Week1",
              theatres: NETWORK_SHORT.map(t => ({
                name: t.name,
                tickets: Math.round(t.cum / 180),
                grossPaise: t.cum * 100,
                gstPaise: Math.round(t.cum * 0.18 / 1.18) * 100,
                netPaise: Math.round(t.cum * 0.78) * 100,
                distSharePaise: Math.round(t.cum * 0.39) * 100,
                theatreSharePaise: Math.round(t.cum * 0.39) * 100,
              })),
            })}><Icon name="download" size={13} /> Export Excel</button>
          </>}
        />
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Report cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {REPORTS.map(r => (
              <div key={r.name} className="app-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6, cursor: "pointer" }}
                onClick={() => { if (r.path) navigate(r.path); }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Icon name="chart" size={16} color="var(--accent)" />
                  {r.pin && <span style={{ fontSize: 10, color: "var(--ink-3)" }}>★ Pinned</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {/* Film P&L + Channel donut */}
          <div className="app-card">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Film P&L · Jungle</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Day 1–7 · Nizam territory · 28 theatres</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <select className="select" style={{ width: 120, height: 28, fontSize: 12 }} defaultValue="week"><option value="week">Week 1</option><option>Week 2</option><option>MTD</option></select>
                <button className="btn btn-sm">CGST + SGST view</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 0 }}>
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
        </div>
      </main>
    </div>
  );
}

function Donut() {
  const segs = [{ c: "var(--accent)", v: 34 }, { c: "#1e6fbb", v: 18 }, { c: "var(--ok)", v: 46 }, { c: "var(--ink-4)", v: 2 }];
  const C = 2 * Math.PI * 40;
  let off = 0;
  return (
    <svg width="160" height="160" viewBox="0 0 100 100" style={{ alignSelf: "center" }}>
      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-soft)" strokeWidth="14" />
      {segs.map((s, i) => {
        const len = (s.v / 100) * C;
        const dash = `${len} ${C - len}`;
        const el = <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={s.c} strokeWidth="14" strokeDasharray={dash} strokeDashoffset={-off} transform="rotate(-90 50 50)" />;
        off += len; return el;
      })}
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
