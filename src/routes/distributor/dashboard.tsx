import { useNavigate } from "react-router-dom";
import { fmtINR, fmtQty, fmtCompact, pct } from "../../lib/formatting";
import { StatusBadge, Metric, Spark, Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

const NETWORK = [
  { code: "SDH", name: "Sandhya 70mm", city: "Hyderabad", cap: 642, today: 184960, occ: 78, cum: 1240500, share: 92480, status: "ok", trend: [110,140,160,180,200,178,184] },
  { code: "DEV", name: "Devi 70mm", city: "Hyderabad", cap: 580, today: 162400, occ: 71, cum: 1098200, share: 81200, status: "ok", trend: [100,118,138,160,162,165,162] },
  { code: "SUD", name: "Sudarshan 35mm", city: "Secunderabad", cap: 480, today: 121300, occ: 64, cum: 812400, share: 60650, status: "ok", trend: [80,98,110,118,120,121,121] },
  { code: "SRK", name: "Sri Ramakrishna", city: "Karimnagar", cap: 420, today: 92800, occ: 55, cum: 584800, share: 46400, status: "late", trend: [70,82,84,90,91,92,92] },
  { code: "VEN", name: "Venkateshwara", city: "Warangal", cap: 480, today: 88600, occ: 52, cum: 611000, share: 44300, status: "ok", trend: [62,71,79,84,88,89,88] },
  { code: "MUR", name: "Murali 70mm", city: "Nizamabad", cap: 380, today: 74200, occ: 48, cum: 478000, share: 37100, status: "ok", trend: [55,60,65,70,72,73,74] },
  { code: "LAK", name: "Laxmi Talkies", city: "Khammam", cap: 360, today: 0, occ: 0, cum: 398000, share: 0, status: "defaulter", trend: [50,55,58,60,0,0,0] },
  { code: "ANJ", name: "Anjali Cinema", city: "Mahbubnagar", cap: 320, today: 58200, occ: 44, cum: 342000, share: 29100, status: "ok", trend: [42,46,49,52,55,57,58] },
];

export default function DistributorDashboardPage() {
  const navigate = useNavigate();
  const totalToday = NETWORK.reduce((a, t) => a + t.today, 0);
  const defaulters = NETWORK.filter(t => t.status === "defaulter").length;
  const late = NETWORK.filter(t => t.status === "late").length;
  const barData = [11.2, 13.4, 14.1, 15.8, 16.2, 15.6, 17.3];
  const barDays = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"];
  const barMax = Math.max(...barData);

  function handleNav(id: string) {
    if (id === "dash") navigate("/distributor");
    if (id === "films") navigate("/distributor/films");
    if (id === "thr") navigate("/distributor/theatres");
    if (id === "sett") navigate("/distributor/settlements");
    if (id === "rep") navigate("/distributor/reports");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="dash" onNav={handleNav} role="distributor" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader
          title="Jungle · Nizam territory"
          sub="Day 8 of release · 28 theatres · Friday Pictures"
          breadcrumb={["Films", "Jungle", "Dashboard"]}
          actions={<>
            <select className="select" style={{ width: 140 }} defaultValue="jungle"><option value="jungle">Jungle</option><option>Vetagadu</option><option>Magadheera 2</option></select>
            <button className="btn btn-sm"><Icon name="refresh" size={13} /> Live</button>
            <button className="btn btn-sm"><Icon name="download" size={13} /> Export</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/distributor/settlements")}>Generate settlements</button>
          </>}
        />
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <Metric lbl="Today's gross" val={fmtCompact(totalToday)} sub="Across 28 theatres" delta="+8.2%" />
            <Metric lbl="Cumulative gross" val={fmtCompact(NETWORK.reduce((a, t) => a + t.cum, 0))} sub="Since 28 Apr release" />
            <Metric lbl="MG recovery" val="70.2%" sub={fmtCompact(8420000) + " / " + fmtCompact(12000000)} />
            <Metric lbl="Pending settlements" val="₹12.4 L" sub={`${defaulters} defaulter, ${late} late`} delta="-2" />
          </div>

          {/* Bar chart */}
          <div className="app-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Daily collection — last 7 days</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Sum across all Nizam theatres</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["7D", "14D", "MTD"].map((p, i) => (
                  <button key={p} className={"btn btn-sm " + (i === 0 ? "btn-primary" : "")}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 180, padding: "0 4px" }}>
              {barData.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", width: "100%", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }} className="tnum">₹{v.toFixed(1)}L</div>
                    <div style={{
                      width: "80%", height: `${(v / barMax) * 100}%`,
                      background: i === barData.length - 1 ? "var(--accent)" : "color-mix(in oklab, var(--accent) 30%, var(--bg-soft))",
                      borderRadius: "4px 4px 0 0",
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: i === barData.length - 1 ? "var(--ink-1)" : "var(--ink-3)", fontWeight: i === barData.length - 1 ? 600 : 400 }}>{barDays[i]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Defaulter alert */}
          {defaulters > 0 && (
            <div style={{
              padding: "12px 14px", borderRadius: 8,
              background: "var(--bad-soft)", border: "1px solid color-mix(in oklab, var(--bad) 25%, transparent)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 100, background: "var(--bad)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="warn" size={14} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bad)" }}>1 theatre hasn't submitted today's CDR</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>Laxmi Talkies, Khammam — last submission 1 May. Rep: Kiran B. (+91 90XXX XX112)</div>
              </div>
              <button className="btn btn-sm">Send reminder</button>
              <button className="btn btn-sm btn-danger">Flag</button>
            </div>
          )}

          {/* Theatre table */}
          <div className="app-card">
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Theatres</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Real-time · sorted by today's gross</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="input" style={{ width: 200, height: 28, fontSize: 12 }} placeholder="Search theatres" readOnly />
                <button className="btn btn-sm">All territories</button>
              </div>
            </div>
            <table className="tbl">
              <thead><tr>
                <th>Theatre</th><th>City</th><th className="num">Today</th><th className="num">Occ.</th>
                <th>Trend (7D)</th><th className="num">Cumulative</th><th className="num">Dist. share</th>
                <th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {NETWORK.map(t => (
                  <tr key={t.code}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 5, background: "var(--bg-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", flexShrink: 0 }}>{t.code}</div>
                        <span style={{ fontWeight: 500 }}>{t.name}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--ink-3)" }}>{t.city}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{t.today ? fmtINR(t.today) : "—"}</td>
                    <td className="num">
                      <span style={{
                        padding: "2px 7px", borderRadius: 100, fontSize: 11,
                        background: t.occ > 65 ? "var(--ok-soft)" : t.occ > 50 ? "var(--bg-soft)" : "var(--warn-soft)",
                        color: t.occ > 65 ? "var(--ok)" : t.occ > 50 ? "var(--ink-2)" : "var(--warn)",
                      }}>{t.occ ? pct(t.occ, 0) : "—"}</span>
                    </td>
                    <td style={{ width: 80 }}><Spark data={t.trend} color={t.status === "defaulter" ? "var(--bad)" : "var(--accent)"} /></td>
                    <td className="num" style={{ color: "var(--ink-2)" }}>{fmtINR(t.cum)}</td>
                    <td className="num">{t.share ? fmtINR(t.share) : "—"}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="num"><button className="btn btn-ghost btn-sm" style={{ padding: "0 6px" }}><Icon name="chevron" size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
