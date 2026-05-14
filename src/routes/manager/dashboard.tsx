import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty, pct } from "../../lib/formatting";
import { useUserContext } from "../../hooks/useUserContext";
import { useToast } from "../../hooks/useToast";
import { useCDRRealtime } from "../../lib/realtime";
import { generateDailySchedule, getShowStatus } from "../../lib/scheduler";
import { StatusBadge, Metric, Icon, ChannelCard } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

interface ShowRow {
  id: string; showNumber: number; time: string; status: string;
  qty: number; gross: number; gst: number; comm: number; maint: number; net: number;
  channel: { bms: number; district: number; counter: number; comp: number } | null;
}

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const uc = useUserContext();
  const toast = useToast();
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  // Realtime: auto-refresh when CDRs change
  useCDRRealtime(uc.bookingId, () => loadShows(), () => loadShows());

  useEffect(() => {
    if (!uc.loading && uc.bookingId) loadShows();
    if (!uc.loading && !uc.bookingId) { setLoading(false); setError("No active booking found."); }
  }, [uc.loading, uc.bookingId]);

  async function loadShows() {
    if (!uc.bookingId) return;
    try {
      setLoading(true);
      const todayISO = today.toISOString().split("T")[0];
      const { data: cdrs, error: err } = await (supabase as any)
        .from("cdrs").select("*")
        .eq("theatre_booking_id", uc.bookingId)
        .eq("show_date", todayISO)
        .order("show_number");

      if (err) throw new Error(err.message);

      const showTimings = generateDailySchedule();
      const hours = showTimings.map(s => {
        const [h, m] = s.startTime.split(":").map(Number);
        return h + m / 60;
      });
      const currentHour = today.getHours() + today.getMinutes() / 60;

      setShows(showTimings.map((slot, i) => {
        const cdr = cdrs?.find((c: any) => c.show_number === i + 1);
        if (cdr) {
          const g = cdr.gross_collection_paise / 100;
          const gstVal = cdr.gst_paise / 100;
          const commVal = (cdr.bms_commission_paise + cdr.district_commission_paise) / 100;
          const maintVal = cdr.total_qty * 5;
          return {
            id: cdr.id, showNumber: i + 1, time: slot.displayTime, status: cdr.status,
            qty: cdr.total_qty, gross: g, gst: gstVal, comm: commVal, maint: maintVal, net: g - gstVal - commVal,
            channel: { bms: cdr.bms_qty, district: cdr.district_qty, counter: cdr.counter_qty, comp: cdr.comp_qty },
          };
        }
        return { id: `p-${i+1}`, showNumber: i+1, time: slot.displayTime, status: getShowStatus(slot.status, null), qty: 0, gross: 0, gst: 0, comm: 0, maint: 0, net: 0, channel: null };
      }));
      setError(null);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleApprove(id: string) {
    try {
      const { error } = await (supabase as any).from("cdrs")
        .update({ status: "approved", approved_by: uc.userId, approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      setShows(prev => prev.map(s => s.id === id ? { ...s, status: "approved" } : s));
      toast.success("CDR approved");
    } catch (err: any) { toast.error("Approve failed: " + err.message); }
  }

  async function handleReject(id: string) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      const { error } = await (supabase as any).from("cdrs")
        .update({ status: "rejected", rejected_reason: reason })
        .eq("id", id);
      if (error) throw new Error(error.message);
      setShows(prev => prev.map(s => s.id === id ? { ...s, status: "rejected" } : s));
      toast.warning("CDR rejected");
    } catch (err: any) { toast.error("Reject failed: " + err.message); }
  }

  const active = shows.filter(s => s.status !== "locked");
  const grossToday = active.reduce((a, s) => a + s.gross, 0);
  const gstToday = active.reduce((a, s) => a + s.gst, 0);
  const commToday = active.reduce((a, s) => a + s.comm, 0);
  const maintToday = active.reduce((a, s) => a + s.maint, 0);
  const netToday = active.reduce((a, s) => a + s.net, 0);
  const qtyToday = active.reduce((a, s) => a + s.qty, 0);
  const occ = uc.theatreCapacity > 0 ? (qtyToday / (uc.theatreCapacity * 4)) * 100 : 0;
  const pending = shows.find(s => s.status === "submitted");

  const totalBms = active.reduce((a, s) => a + (s.channel?.bms || 0), 0);
  const totalDist = active.reduce((a, s) => a + (s.channel?.district || 0), 0);
  const totalCounter = active.reduce((a, s) => a + (s.channel?.counter || 0), 0);
  const avgPrice = qtyToday > 0 ? grossToday / qtyToday : 0;
  const bmsAmt = Math.round(totalBms * avgPrice);
  const distAmt = Math.round(totalDist * avgPrice);
  const counterAmt = Math.round(totalCounter * avgPrice);

  function handleNav(id: string) {
    if (id === "dash") navigate("/manager");
    if (id === "cdrs") navigate("/manager");
    if (id === "sheet") navigate("/manager/daily-sheet");
    if (id === "exp") navigate("/manager/expenses");
    if (id === "sett") navigate("/manager/reports");
    if (id === "rep") navigate("/manager/reports");
  }

  if (loading && shows.length === 0) return <div style={{ display: "flex", height: "100vh" }}><Sidebar active="dash" onNav={handleNav} role="manager" /><main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 13, color: "var(--ink-3)" }}>Loading dashboard…</div></main></div>;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="dash" onNav={handleNav} role="manager" />
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <PageHeader
          title="Dashboard"
          sub={`${uc.theatreName || "Theatre"} · ${dateStr} · ${uc.filmTitle || "Film"} Day ${uc.filmDay}`}
          breadcrumb={[uc.theatreName || "Theatre", "Today"]}
          actions={<>
            <button className="btn btn-sm"><Icon name="print" size={13} /> Export PDF</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/manager/daily-sheet")}>Submit Daily Sheet <Icon name="arrowR" size={13} /></button>
          </>}
        />

        {error && <div style={{ margin: "14px 24px 0", padding: "10px 14px", borderRadius: 6, background: "var(--bad-soft)", color: "var(--bad)", fontSize: 13 }}>{error}</div>}

        {pending && (
          <div style={{ margin: "14px 24px 0", padding: "12px 14px", borderRadius: 8, background: "var(--accent-soft)", border: "1px solid color-mix(in oklab, var(--accent) 25%, transparent)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 100, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="bell" size={15} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>New CDR submitted</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>Show {pending.showNumber} · {pending.time} · {fmtQty(pending.qty)} tix · {fmtINR(pending.gross)}</div>
            </div>
            <button className="btn btn-sm" onClick={() => handleReject(pending.id)}><Icon name="x" size={13} /> Reject</button>
            <button className="btn btn-primary btn-sm" onClick={() => handleApprove(pending.id)}><Icon name="check" size={13} /> Approve</button>
          </div>
        )}

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <Metric lbl="Gross collection" val={fmtINR(grossToday)} sub={`${active.length} of ${shows.length} shows`} />
            <Metric lbl="Net (after deductions)" val={fmtINR(netToday)} sub="GST + commissions excluded" />
            <Metric lbl="Tickets sold" val={fmtQty(qtyToday)} sub={`Capacity ${fmtQty(uc.theatreCapacity * 4)}`} />
            <Metric lbl="Occupancy" val={pct(occ)} sub="Today" />
          </div>

          <div className="app-card">
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)" }}>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>Show-wise breakdown</div></div>
            </div>
            <table className="tbl">
              <thead><tr><th>Show</th><th>Time</th><th className="num">Tickets</th><th className="num">Gross</th><th className="num">GST</th><th className="num">Net</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {shows.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>#{s.showNumber}</td><td>{s.time}</td>
                    <td className="num">{s.qty || "—"}</td><td className="num">{s.gross ? fmtINR(s.gross) : "—"}</td>
                    <td className="num" style={{ color: "var(--ink-3)" }}>{s.gross ? fmtINR(s.gst) : "—"}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{s.gross ? fmtINR(s.net) : "—"}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="num">
                      {s.status === "submitted" ? <button className="btn btn-primary btn-sm" onClick={() => handleApprove(s.id)}>Approve</button>
                        : <button className="btn btn-ghost btn-sm" disabled={s.status === "locked"}><Icon name="eye" size={13} /></button>}
                    </td>
                  </tr>
                ))}
                {qtyToday > 0 && (
                  <tr style={{ background: "var(--bg-soft)" }}>
                    <td colSpan={2} style={{ fontWeight: 600 }}>Day total</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtQty(qtyToday)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtINR(grossToday)}</td>
                    <td className="num">{fmtINR(gstToday)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{fmtINR(netToday)}</td>
                    <td colSpan={2}></td>
                  </tr>
                )}
              </tbody>
            </table>
            {shows.every(s => s.status === "locked") && <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No shows submitted yet today. Waiting for Rep submissions.</div>}
          </div>

          {qtyToday > 0 && (
            <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Channel reconciliation</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <ChannelCard label="BMS" qty={totalBms} amt={bmsAmt} note="Online" date="T+3" color="var(--accent)" />
                <ChannelCard label="District" qty={totalDist} amt={distAmt} note="Online" date="T+3" color="#1e6fbb" />
                <ChannelCard label="Counter" qty={totalCounter} amt={counterAmt} note="Cash + UPI" date="In hand" color="var(--ok)" />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
