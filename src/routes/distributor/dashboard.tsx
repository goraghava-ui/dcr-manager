import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty, fmtCompact } from "../../lib/formatting";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { StatusBadge, Metric, Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

interface TheatreRow {
  theatre_id: string; theatre_name: string; city: string; booking_id: string;
  today_gross: number; today_tickets: number; cum_gross: number; capacity: number;
  dist_share_pct: number; last_cdr_date: string | null;
}

export default function DistributorDashboardPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const toast = useToast();
  const isProducer = role === "producer";
  const [theatres, setTheatres] = useState<TheatreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const todayISO = new Date().toISOString().split("T")[0];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Get all active bookings with theatre info
      const { data: bookings } = await (supabase as any).from("theatre_bookings")
        .select("id, theatre_id, distributor_share_pct, theatres(name, city, total_seats)")
        .eq("is_active", true);

      if (!bookings?.length) { setTheatres([]); setLoading(false); return; }

      // Get all CDRs for today + cumulative
      const bookingIds = bookings.map((b: any) => b.id);
      const { data: allCdrs } = await (supabase as any).from("cdrs")
        .select("theatre_booking_id, show_date, total_qty, gross_collection_paise, net_collection_paise, status")
        .in("theatre_booking_id", bookingIds);

      const rows: TheatreRow[] = bookings.map((b: any) => {
        const cdrs = (allCdrs || []).filter((c: any) => c.theatre_booking_id === b.id);
        const todayCdrs = cdrs.filter((c: any) => c.show_date === todayISO);
        const approvedCdrs = cdrs.filter((c: any) => c.status === "approved" || c.status === "submitted");
        const lastCdr = cdrs.length ? cdrs.sort((a: any, b: any) => b.show_date.localeCompare(a.show_date))[0] : null;

        return {
          theatre_id: b.theatre_id, theatre_name: b.theatres?.name || "-", city: b.theatres?.city || "-",
          booking_id: b.id, capacity: b.theatres?.total_seats || 0, dist_share_pct: b.distributor_share_pct,
          today_gross: todayCdrs.reduce((a: number, c: any) => a + c.gross_collection_paise, 0) / 100,
          today_tickets: todayCdrs.reduce((a: number, c: any) => a + c.total_qty, 0),
          cum_gross: approvedCdrs.reduce((a: number, c: any) => a + c.gross_collection_paise, 0) / 100,
          last_cdr_date: lastCdr?.show_date || null,
        };
      });

      setTheatres(rows);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  }

  const totalToday = theatres.reduce((a, t) => a + t.today_gross, 0);
  const totalCum = theatres.reduce((a, t) => a + t.cum_gross, 0);
  const totalTickets = theatres.reduce((a, t) => a + t.today_tickets, 0);
  const defaulters = theatres.filter(t => t.today_gross === 0 && t.last_cdr_date !== todayISO).length;

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
        <PageHeader title="Dashboard" sub={`${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })} · ${theatres.length} theatres`}
          breadcrumb={["Distributor", "Dashboard"]}
          actions={<>{!isProducer && <button className="btn btn-primary btn-sm" onClick={() => navigate("/distributor/settlements")}>Generate settlements</button>}</>} />
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <Metric lbl="Today's gross" val={fmtCompact(totalToday)} sub={`${fmtQty(totalTickets)} tickets`} />
            <Metric lbl="Cumulative gross" val={fmtCompact(totalCum)} sub="All approved CDRs" />
            <Metric lbl="Active theatres" val={String(theatres.length)} sub={`${defaulters} defaulters`} />
            <Metric lbl="Today's tickets" val={fmtQty(totalTickets)} sub={`Across ${theatres.filter(t => t.today_tickets > 0).length} theatres`} />
          </div>

          {/* Theatre table */}
          {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading theatres...</div> :
          theatres.length === 0 ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 48 }}>
            <Icon name="building" size={32} color="var(--ink-4)" />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No active theatre bookings</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>Admin needs to assign films to theatres first.</div>
          </div> :
          <div className="app-card" style={{ overflow: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Theatre</th><th>City</th><th className="num">Today gross</th><th className="num">Today tix</th><th className="num">Occ%</th><th className="num">Cumulative</th><th className="num">Dist%</th><th>Status</th></tr></thead>
              <tbody>
                {theatres.sort((a, b) => b.today_gross - a.today_gross).map(t => {
                  const occ = t.capacity > 0 ? Math.round(t.today_tickets / t.capacity * 100) : 0;
                  const isDefaulter = t.today_gross === 0 && t.last_cdr_date !== todayISO;
                  return (
                    <tr key={t.booking_id}>
                      <td style={{ fontWeight: 600 }}>{t.theatre_name}</td>
                      <td>{t.city}</td>
                      <td className="num">{t.today_gross > 0 ? fmtINR(t.today_gross) : "—"}</td>
                      <td className="num">{t.today_tickets || "—"}</td>
                      <td className="num">{occ > 0 ? occ + "%" : "—"}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmtINR(t.cum_gross)}</td>
                      <td className="num">{t.dist_share_pct}%</td>
                      <td>{isDefaulter ? <span style={{ color: "var(--bad)", fontWeight: 600, fontSize: 12 }}>● No CDR</span> : t.today_gross > 0 ? <span style={{ color: "var(--ok)", fontSize: 12 }}>● Active</span> : <span style={{ color: "var(--ink-4)", fontSize: 12 }}>● —</span>}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: "var(--bg-soft)", fontWeight: 700 }}>
                  <td colSpan={2}>Total ({theatres.length} theatres)</td>
                  <td className="num">{fmtINR(totalToday)}</td>
                  <td className="num">{fmtQty(totalTickets)}</td>
                  <td className="num"></td>
                  <td className="num">{fmtINR(totalCum)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>}
        </div>
      </main>
    </div>
  );
}
