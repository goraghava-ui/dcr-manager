import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { useUserContext } from "../../hooks/useUserContext";
import { useToast } from "../../hooks/useToast";
import { StatusBadge, Icon, Metric } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";
import { generateDailySchedule } from "../../lib/scheduler";

export default function DailySheetPage() {
  const navigate = useNavigate();
  const uc = useUserContext();
  const toast = useToast();
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);

  const [submitting, setSubmitting] = useState(false);

  async function submitDailySheet() {
    if (submitted.length === 0) { toast.warning("No CDRs to submit"); return; }
    setSubmitting(true);
    try {
      // Lock all CDRs for this date (set status to approved if submitted)
      const todayCdrs = shows.filter(s => s.status === "submitted");
      for (const s of todayCdrs) {
        if (s.status === "submitted") {
          const { data: { user } } = await supabase.auth.getUser();
          await (supabase as any).from("cdrs").update({ status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() })
            .eq("theatre_booking_id", uc.bookingId).eq("show_date", dateStr).eq("show_number", s.show);
        }
      }
      toast.success("Daily sheet submitted! " + submitted.length + " CDRs approved and locked.");
      loadSheet();
    } catch (err: any) { toast.error(err.message); }
    setSubmitting(false);
  }

  function handleNav(id: string) {
    if (id === "dash") navigate("/manager");
    if (id === "cdrs") navigate("/manager/cdrs");
    if (id === "sheet") navigate("/manager/daily-sheet");
    if (id === "exp") navigate("/manager/expenses");
    if (id === "sett") navigate("/manager/settlements");
    if (id === "rep") navigate("/manager/reports");
  }

  useEffect(() => { if (!uc.loading && uc.bookingId) loadSheet(); }, [uc.loading, uc.bookingId, dateStr]);

  async function loadSheet() {
    setLoading(true);
    const schedule = generateDailySchedule({ firstShowTime: uc.firstShowTime, intervalMinutes: uc.showGapMinutes, showCount: uc.numShows, showDurationMinutes: 150, cdrWindowMinutes: 60 });
    const { data: cdrs } = await (supabase as any).from("cdrs")
      .select("*")
      .eq("theatre_booking_id", uc.bookingId)
      .eq("show_date", dateStr)
      .order("show_number");

    const merged = schedule.map((slot: any, i: number) => {
      const cdr = cdrs?.find((c: any) => c.show_number === i + 1);
      if (cdr) {
        return {
          show: i + 1, time: slot.displayTime, tickets: cdr.total_qty,
          gross: cdr.gross_collection_paise / 100, gst: cdr.gst_paise / 100,
          comm: (cdr.bms_commission_paise + cdr.district_commission_paise) / 100,
          maint: cdr.total_qty * 5, net: cdr.net_collection_paise / 100,
          status: cdr.status, bms: cdr.bms_qty, district: cdr.district_qty, counter: cdr.counter_qty,
        };
      }
      return { show: i + 1, time: slot.displayTime, tickets: 0, gross: 0, gst: 0, comm: 0, maint: 0, net: 0, status: "pending", bms: 0, district: 0, counter: 0 };
    });
    setShows(merged);
    setLoading(false);
  }

  const submitted = shows.filter(s => s.status !== "pending");
  const gross = submitted.reduce((a, s) => a + s.gross, 0);
  const gst = submitted.reduce((a, s) => a + s.gst, 0);
  const comm = submitted.reduce((a, s) => a + s.comm, 0);
  const maint = submitted.reduce((a, s) => a + s.maint, 0);
  const net = submitted.reduce((a, s) => a + s.net, 0);
  const tickets = submitted.reduce((a, s) => a + s.tickets, 0);
  const distShare = Math.round(net * (parseFloat(String(uc.distributorSharePct)) || 50) / 100);
  const theatreShare = net - distShare;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="sheet" onNav={handleNav} role="manager" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader title="Daily Sheet" sub={`${uc.theatreName} · ${new Date(dateStr).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`}
          breadcrumb={["Manager", "Daily Sheet"]}
          actions={<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" className="input" value={dateStr} onChange={e => setDateStr(e.target.value)} style={{ height: 32, fontSize: 12 }} />
            <button className="btn btn-primary btn-sm" onClick={submitDailySheet} disabled={submitting || submitted.length === 0}>{submitting ? "Submitting..." : "Submit Daily Sheet"}</button>
          </div>} />
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <Metric lbl="Gross" val={fmtINR(gross)} sub={`${submitted.length} of ${shows.length} shows`} />
            <Metric lbl="Net (after deductions)" val={fmtINR(net)} sub="GST + commissions" />
            <Metric lbl="Distributor share" val={fmtINR(distShare)} sub={`${uc.distributorSharePct}%`} />
            <Metric lbl="Theatre share" val={fmtINR(theatreShare)} sub={`${100 - (parseFloat(String(uc.distributorSharePct)) || 50)}%`} />
          </div>

          {/* Show table */}
          {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading...</div> :
          <div className="app-card" style={{ overflow: "auto" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", fontSize: 14, fontWeight: 600 }}>
              Show-wise breakdown · {submitted.length} CDRs
            </div>
            <table className="tbl">
              <thead><tr><th>Show</th><th>Time</th><th className="num">Tickets</th><th className="num">Gross</th><th className="num">GST</th><th className="num">Comm.</th><th className="num">Maint.</th><th className="num">Net</th><th>Status</th></tr></thead>
              <tbody>
                {shows.map(s => (
                  <tr key={s.show} style={{ opacity: s.status === "pending" ? 0.4 : 1 }}>
                    <td style={{ fontWeight: 600 }}>#{s.show}</td>
                    <td>{s.time}</td>
                    <td className="num">{s.tickets || "—"}</td>
                    <td className="num">{s.gross ? fmtINR(s.gross) : "—"}</td>
                    <td className="num">{s.gst ? fmtINR(s.gst) : "—"}</td>
                    <td className="num">{s.comm ? fmtINR(s.comm) : "—"}</td>
                    <td className="num">{s.maint ? fmtINR(s.maint) : "—"}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{s.net ? fmtINR(s.net) : "—"}</td>
                    <td><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
                <tr style={{ background: "var(--bg-soft)", fontWeight: 700 }}>
                  <td colSpan={2}>Day total</td>
                  <td className="num">{fmtQty(tickets)}</td>
                  <td className="num">{fmtINR(gross)}</td>
                  <td className="num">{fmtINR(gst)}</td>
                  <td className="num">{fmtINR(comm)}</td>
                  <td className="num">{fmtINR(maint)}</td>
                  <td className="num">{fmtINR(net)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>}

          {/* Channel split */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <div className="app-card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>BMS (BookMyShow)</div>
              <div className="tnum" style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{fmtQty(submitted.reduce((a, s) => a + s.bms, 0))} tix</div>
            </div>
            <div className="app-card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>District app</div>
              <div className="tnum" style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{fmtQty(submitted.reduce((a, s) => a + s.district, 0))} tix</div>
            </div>
            <div className="app-card" style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Counter (cash/UPI)</div>
              <div className="tnum" style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{fmtQty(submitted.reduce((a, s) => a + s.counter, 0))} tix</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
