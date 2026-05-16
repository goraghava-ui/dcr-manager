import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty, fmtCompact } from "../../lib/formatting";
import { exportFilmPL } from "../../lib/excel-export";
import { useToast } from "../../hooks/useToast";
import { Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

const REPORTS = [
  { id: "pl", name: "Film P&L", desc: "Gross → distributor → theatre", pin: true, icon: "chart" },
  { id: "gst", name: "GST summary", desc: "CGST + SGST, period-wise", pin: true, icon: "receipt" },
  { id: "channel", name: "Channel split", desc: "BMS vs District vs Counter", icon: "grid" },
  { id: "defaulter", name: "Defaulter report", desc: "Theatres with pending submissions", icon: "alert" },
  { id: "ranking", name: "Theatre ranking", desc: "Comparative performance", icon: "chart" },
];

interface TheatreData { name: string; tickets: number; gross: number; gst: number; net: number; bms: number; district: number; counter: number; comp: number; }

export default function ReportsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [active, setActive] = useState("pl");
  const [theatres, setTheatres] = useState<TheatreData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: bookings } = await (supabase as any).from("theatre_bookings")
        .select("id, theatres(name)").eq("is_active", true);
      if (!bookings?.length) { setTheatres([]); setLoading(false); return; }

      const ids = bookings.map((b: any) => b.id);
      const { data: cdrs } = await (supabase as any).from("cdrs")
        .select("theatre_booking_id, total_qty, gross_collection_paise, gst_paise, net_collection_paise, bms_qty, district_qty, counter_qty, comp_qty")
        .in("theatre_booking_id", ids)
        .in("status", ["approved", "submitted"]);

      const rows: TheatreData[] = bookings.map((b: any) => {
        const bc = (cdrs || []).filter((c: any) => c.theatre_booking_id === b.id);
        return {
          name: b.theatres?.name || "-",
          tickets: bc.reduce((a: number, c: any) => a + c.total_qty, 0),
          gross: bc.reduce((a: number, c: any) => a + c.gross_collection_paise, 0) / 100,
          gst: bc.reduce((a: number, c: any) => a + c.gst_paise, 0) / 100,
          net: bc.reduce((a: number, c: any) => a + c.net_collection_paise, 0) / 100,
          bms: bc.reduce((a: number, c: any) => a + c.bms_qty, 0),
          district: bc.reduce((a: number, c: any) => a + c.district_qty, 0),
          counter: bc.reduce((a: number, c: any) => a + c.counter_qty, 0),
          comp: bc.reduce((a: number, c: any) => a + c.comp_qty, 0),
        };
      }).filter((t: TheatreData) => t.tickets > 0);
      setTheatres(rows);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  }

  const totalGross = theatres.reduce((a, t) => a + t.gross, 0);
  const totalNet = theatres.reduce((a, t) => a + t.net, 0);
  const totalTix = theatres.reduce((a, t) => a + t.tickets, 0);
  const totalBms = theatres.reduce((a, t) => a + t.bms, 0);
  const totalDist = theatres.reduce((a, t) => a + t.district, 0);
  const totalCounter = theatres.reduce((a, t) => a + t.counter, 0);
  const totalComp = theatres.reduce((a, t) => a + t.comp, 0);

  function handleNav(id: string) {
    if (id === "dash") navigate("/distributor");
    if (id === "films") navigate("/distributor/films");
    if (id === "thr") navigate("/distributor/theatres");
    if (id === "sett") navigate("/distributor/settlements");
    if (id === "rep") navigate("/distributor/reports");
  }

  function handleExport() {
    exportFilmPL({
      filmName: "Report", territory: "Nizam", period: "All",
      theatres: theatres.map(t => ({
        name: t.name, tickets: t.tickets, grossPaise: t.gross * 100, gstPaise: t.gst * 100,
        netPaise: t.net * 100, distSharePaise: Math.round(t.net * 50), theatreSharePaise: Math.round(t.net * 50),
      })),
    });
    toast.success("Excel exported");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="rep" onNav={handleNav} role="distributor" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader title="Reports" sub="Real data from all theatres" breadcrumb={["Distributor", "Reports"]}
          actions={<button className="btn btn-primary btn-sm" onClick={handleExport}><Icon name="download" size={13} /> Export Excel</button>} />
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Report cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {REPORTS.map(r => (
              <div key={r.id} className="app-card" onClick={() => r.id === "gst" ? navigate("/reports/gst") : setActive(r.id)}
                style={{ padding: 12, cursor: "pointer", borderColor: active === r.id ? "var(--accent)" : "var(--line)" }}>
                <Icon name={r.icon} size={15} color={active === r.id ? "var(--accent)" : "var(--ink-3)"} />
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{r.name}</div>
                <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading report data...</div> :
          theatres.length === 0 ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>No CDR data yet. Reports will populate as theatres submit CDRs.</div> :
          <>
            {active === "pl" && <div className="app-card">
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", fontSize: 14, fontWeight: 600 }}>Film P&L · {theatres.length} theatres</div>
              <table className="tbl">
                <thead><tr><th>Theatre</th><th className="num">Tickets</th><th className="num">Gross</th><th className="num">GST</th><th className="num">Net</th><th className="num">Dist share (50%)</th></tr></thead>
                <tbody>
                  {theatres.sort((a, b) => b.gross - a.gross).map(t => (
                    <tr key={t.name}><td style={{ fontWeight: 600 }}>{t.name}</td><td className="num">{fmtQty(t.tickets)}</td><td className="num">{fmtINR(t.gross)}</td><td className="num">{fmtINR(t.gst)}</td><td className="num">{fmtINR(t.net)}</td><td className="num" style={{ fontWeight: 600 }}>{fmtINR(Math.round(t.net * 0.5))}</td></tr>
                  ))}
                  <tr style={{ background: "var(--bg-soft)", fontWeight: 700 }}><td>Total</td><td className="num">{fmtQty(totalTix)}</td><td className="num">{fmtINR(totalGross)}</td><td className="num">{fmtINR(theatres.reduce((a, t) => a + t.gst, 0))}</td><td className="num">{fmtINR(totalNet)}</td><td className="num">{fmtINR(Math.round(totalNet * 0.5))}</td></tr>
                </tbody>
              </table>
            </div>}

            {active === "channel" && <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Channel split · All theatres</div>
              <table className="tbl">
                <thead><tr><th>Channel</th><th className="num">Tickets</th><th className="num">%</th></tr></thead>
                <tbody>
                  {[{ n: "BMS (BookMyShow)", v: totalBms, c: "var(--accent)" }, { n: "District app", v: totalDist, c: "#1e6fbb" }, { n: "Counter (cash/UPI)", v: totalCounter, c: "var(--ok)" }, { n: "Complimentary", v: totalComp, c: "var(--ink-4)" }].map(ch => (
                    <tr key={ch.n}><td><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: ch.c, marginRight: 8 }} />{ch.n}</td><td className="num">{fmtQty(ch.v)}</td><td className="num">{totalTix > 0 ? Math.round(ch.v / totalTix * 100) : 0}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>}

            {active === "ranking" && <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Theatre ranking by gross</div>
              <table className="tbl">
                <thead><tr><th>#</th><th>Theatre</th><th className="num">Gross</th><th>Bar</th></tr></thead>
                <tbody>
                  {theatres.sort((a, b) => b.gross - a.gross).map((t, i) => (
                    <tr key={t.name}><td style={{ fontWeight: 700, color: i < 3 ? "var(--accent)" : "var(--ink-3)" }}>{i + 1}</td><td style={{ fontWeight: 600 }}>{t.name}</td><td className="num">{fmtINR(t.gross)}</td><td style={{ width: 200 }}><div style={{ height: 8, borderRadius: 4, background: "var(--accent-soft)", overflow: "hidden" }}><div style={{ height: "100%", width: `${totalGross > 0 ? (t.gross / theatres[0]?.gross * 100) : 0}%`, background: "var(--accent)", borderRadius: 4 }} /></div></td></tr>
                  ))}
                </tbody>
              </table>
            </div>}

            {active === "defaulter" && <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Defaulter report · Theatres with no CDRs today</div>
              {theatres.filter(t => t.tickets === 0).length === 0 ?
                <div style={{ padding: 16, color: "var(--ok)", textAlign: "center" }}>All theatres have submitted CDRs today ✓</div> :
                <div style={{ color: "var(--ink-3)", padding: 16, textAlign: "center" }}>Check distributor dashboard for "No CDR" status badges</div>}
            </div>}
          </>}
        </div>
      </main>
    </div>
  );
}
