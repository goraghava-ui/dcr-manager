import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty, pct } from "../../lib/formatting";
import { useCDRRealtime } from "../../lib/realtime";
import {
  Sidebar, PageHeader, StatusBadge, Metric, Icon, ChannelCard,
} from "../../components/ui/shared";

interface ShowRow {
  id: string;
  showNumber: number;
  time: string;
  status: string;
  qty: number;
  gross: number;
  channel: { bms: number; district: number; counter: number; comp: number } | null;
}

const CAPACITY_PER_SHOW = 642;

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  useEffect(() => { loadShows(); }, []);

  // Live updates: reload when new CDRs are submitted or status changes
  const bookingId = "b0000000-0000-0000-0000-000000000001";
  useCDRRealtime(
    bookingId,
    () => loadShows(), // on INSERT
    () => loadShows()  // on UPDATE
  );

  async function loadShows() {
    try {
      const bookingId = "b0000000-0000-0000-0000-000000000001";
      const todayISO = today.toISOString().split("T")[0];
      const { data: cdrs } = await supabase
        .from("cdrs")
        .select("*")
        .eq("theatre_booking_id", bookingId)
        .eq("show_date", todayISO)
        .order("show_number") as any;

      const timings = ["11:00 AM", "02:30 PM", "06:30 PM", "10:00 PM"];
      setShows(timings.map((time, i) => {
        const cdr = cdrs?.find((c: any) => c.show_number === i + 1);
        if (cdr) {
          return {
            id: cdr.id, showNumber: i + 1, time, status: cdr.status,
            qty: cdr.total_qty, gross: cdr.gross_collection_paise / 100,
            channel: { bms: cdr.bms_qty, district: cdr.district_qty, counter: cdr.counter_qty, comp: cdr.comp_qty },
          };
        }
        return { id: `p-${i + 1}`, showNumber: i + 1, time, status: "locked", qty: 0, gross: 0, channel: null };
      }));
    } catch {
      setShows([
        { id: "s1", showNumber: 1, time: "11:00 AM", status: "approved", qty: 312, gross: 56240, channel: { bms: 96, district: 42, counter: 174, comp: 0 } },
        { id: "s2", showNumber: 2, time: "02:30 PM", status: "approved", qty: 348, gross: 63100, channel: { bms: 118, district: 50, counter: 180, comp: 0 } },
        { id: "s3", showNumber: 3, time: "06:30 PM", status: "submitted", qty: 358, gross: 65620, channel: { bms: 124, district: 58, counter: 176, comp: 0 } },
        { id: "s4", showNumber: 4, time: "10:00 PM", status: "locked", qty: 0, gross: 0, channel: null },
      ]);
    } finally { setLoading(false); }
  }

  async function handleApprove(id: string) {
    setShows(prev => prev.map(s => s.id === id ? { ...s, status: "approved" } : s));
    try {
      await (supabase.from("cdrs") as any).update({
        status: "approved",
        approved_at: new Date().toISOString(),
      }).eq("id", id);
    } catch (err) { console.error("Approve failed:", err); }
  }

  async function handleReject(id: string) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    setShows(prev => prev.map(s => s.id === id ? { ...s, status: "rejected" } : s));
    try {
      await (supabase.from("cdrs") as any).update({
        status: "rejected",
        rejected_reason: reason,
      }).eq("id", id);
    } catch (err) { console.error("Reject failed:", err); }
  }

  const active = shows.filter(s => s.status !== "locked");
  const grossToday = active.reduce((a, s) => a + s.gross, 0);
  const qtyToday = active.reduce((a, s) => a + s.qty, 0);
  const gst = grossToday * 0.18 / 1.18;
  const commissions = grossToday * 0.04;
  const netToday = grossToday - gst - commissions;
  const occ = (qtyToday / (CAPACITY_PER_SHOW * 4)) * 100;
  const pending = shows.find(s => s.status === "submitted");

  // Channel aggregation
  const totalBms = active.reduce((a, s) => a + (s.channel?.bms || 0), 0);
  const totalDist = active.reduce((a, s) => a + (s.channel?.district || 0), 0);
  const totalCounter = active.reduce((a, s) => a + (s.channel?.counter || 0), 0);
  const avgPrice = qtyToday > 0 ? grossToday / qtyToday : 0;
  const bmsAmt = Math.round(totalBms * avgPrice);
  const distAmt = Math.round(totalDist * avgPrice);
  const counterAmt = Math.round(totalCounter * avgPrice);

  function handleNav(id: string) {
    if (id === "sheet") navigate("/manager/daily-sheet");
    if (id === "exp") navigate("/manager/expenses");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="dash" onNav={handleNav} role="manager" />
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <PageHeader
          title="Dashboard"
          sub={`Sandhya 70mm · ${dateStr} · Jungle Day 8`}
          breadcrumb={["Sandhya 70mm", "Today"]}
          actions={<>
            <button className="btn btn-sm"><Icon name="print" size={13} /> Export PDF</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/manager/daily-sheet")}>
              Submit Daily Sheet to distributor <Icon name="arrowR" size={13} />
            </button>
          </>}
        />

        {/* New submission banner */}
        {pending && (
          <div style={{
            margin: "14px 24px 0", padding: "12px 14px", borderRadius: 8,
            background: "var(--accent-soft)", border: "1px solid color-mix(in oklab, var(--accent) 25%, transparent)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 100, background: "var(--accent)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}><Icon name="bell" size={15} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>New CDR submitted by Ramesh K.</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>
                Show {pending.showNumber} · {pending.time} · {fmtQty(pending.qty)} tix · {fmtINR(pending.gross)}
              </div>
            </div>
            <button className="btn btn-sm" onClick={() => handleReject(pending.id)}>
              <Icon name="x" size={13} /> Reject
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => handleApprove(pending.id)}>
              <Icon name="check" size={13} /> Approve
            </button>
          </div>
        )}

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 4 metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <Metric lbl="Gross collection" val={fmtINR(grossToday)} sub={`${active.length} of 4 shows submitted`} delta="+12.4%" />
            <Metric lbl="Net (after deductions)" val={fmtINR(netToday, { decimals: 0 })} sub="GST + commissions excluded" />
            <Metric lbl="Tickets sold" val={fmtQty(qtyToday)} sub={`Capacity ${fmtQty(CAPACITY_PER_SHOW * 4)}`} />
            <Metric lbl="Occupancy" val={pct(occ)} sub="vs 71% yesterday" delta="+5.1pt" />
          </div>

          {/* Show-wise breakdown table */}
          <div className="app-card">
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Show-wise breakdown</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Tap a row to review CDR detail</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-sm">Filter</button>
                <button className="btn btn-sm" disabled={!shows.some(s => s.status === "submitted")}>Approve all</button>
              </div>
            </div>
            <table className="tbl">
              <thead><tr>
                <th>Show</th><th>Time</th><th className="num">Tickets</th><th className="num">Gross</th>
                <th className="num">GST</th><th className="num">Comm.</th><th className="num">Maint.</th>
                <th className="num">Net</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {shows.map(s => {
                  const g = s.gross || 0;
                  const sgst = g * 0.18 / 1.18;
                  const comm = g * 0.04;
                  const maint = (s.qty || 0) * 5;
                  const net = g - sgst - comm;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>#{s.showNumber}</td>
                      <td>{s.time}</td>
                      <td className="num">{s.qty ? fmtQty(s.qty) : "—"}</td>
                      <td className="num">{g ? fmtINR(g) : "—"}</td>
                      <td className="num" style={{ color: "var(--ink-3)" }}>{g ? fmtINR(sgst, { decimals: 0 }) : "—"}</td>
                      <td className="num" style={{ color: "var(--ink-3)" }}>{g ? fmtINR(comm, { decimals: 0 }) : "—"}</td>
                      <td className="num" style={{ color: "var(--ink-3)" }}>{g ? fmtINR(maint) : "—"}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{g ? fmtINR(net, { decimals: 0 }) : "—"}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td className="num">
                        {s.status === "submitted"
                          ? <button className="btn btn-primary btn-sm" onClick={() => handleApprove(s.id)}>Approve</button>
                          : <button className="btn btn-ghost btn-sm" disabled={s.status === "locked"}><Icon name="eye" size={13} /></button>}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: "var(--bg-soft)" }}>
                  <td colSpan={2} style={{ fontWeight: 600 }}>Day total</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmtQty(qtyToday)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmtINR(grossToday)}</td>
                  <td className="num">{fmtINR(gst, { decimals: 0 })}</td>
                  <td className="num">{fmtINR(commissions, { decimals: 0 })}</td>
                  <td className="num">{fmtINR(qtyToday * 5)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{fmtINR(netToday, { decimals: 0 })}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Channel reconciliation + expense alert */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div className="app-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Channel reconciliation</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Today's split, with expected settlement dates</div>
                </div>
                <button className="btn btn-sm">Reconcile</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <ChannelCard label="BMS" qty={totalBms} amt={bmsAmt} note="Online · settles T+3" date="8 May" color="var(--accent)" />
                <ChannelCard label="District" qty={totalDist} amt={distAmt} note="Online · settles T+3" date="8 May" color="#1e6fbb" />
                <ChannelCard label="Counter" qty={totalCounter} amt={counterAmt} note="Cash + UPI in hand" date="In hand" color="var(--ok)" />
              </div>
            </div>
            <div className="app-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, background: "var(--warn-soft)", color: "var(--warn)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}><Icon name="alert" size={14} /></div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>3 expenses noted</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                Receipts collected today but not yet entered. Total approx ₹36,100.
              </div>
              <button className="btn btn-sm" style={{ alignSelf: "flex-start" }}
                onClick={() => navigate("/manager/expenses")}>
                Open expense register <Icon name="arrowR" size={12} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
