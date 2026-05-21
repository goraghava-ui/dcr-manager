import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { StatusBadge, Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";
import { useToast } from "../../hooks/useToast";

export default function SettlementsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGen, setShowGen] = useState(false);
  const [genForm, setGenForm] = useState({ booking_id: "", start: "", end: "" });
  const [generating, setGenerating] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: b }] = await Promise.all([
      (supabase as any).from("prd_settlements").select("*, theatre_bookings(theatres(name), films(title))").order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("theatre_bookings").select("id, theatres(name), films(title)").eq("is_active", true),
    ]);
    setSettlements(s || []); setBookings(b || []); setLoading(false);
    if (b?.length && !genForm.booking_id) setGenForm(p => ({ ...p, booking_id: b[0].id }));
  }

  async function generate() {
    if (!genForm.booking_id || !genForm.start || !genForm.end) { toast.warning("Select booking and date range"); return; }
    setGenerating(true);
    try {
      const { data: cdrs } = await (supabase as any).from("cdrs")
        .select("*").eq("theatre_booking_id", genForm.booking_id)
        .gte("show_date", genForm.start).lte("show_date", genForm.end)
        .in("status", ["approved", "submitted"]);

      if (!cdrs?.length) { toast.warning("No CDRs found in this period"); setGenerating(false); return; }

      const { data: booking } = await (supabase as any).from("theatre_bookings")
        .select("distributor_share_pct, theatres(name, maintenance_per_ticket), films(title)")
        .eq("id", genForm.booking_id).single();

      const totalTix = cdrs.reduce((a: number, c: any) => a + c.total_qty, 0);
      const grossP = cdrs.reduce((a: number, c: any) => a + c.gross_collection_paise, 0);
      const gstP = cdrs.reduce((a: number, c: any) => a + c.gst_paise, 0);
      const bmsP = cdrs.reduce((a: number, c: any) => a + c.bms_commission_paise, 0);
      const distP = cdrs.reduce((a: number, c: any) => a + c.district_commission_paise, 0);
      const netP = grossP - gstP - bmsP - distP;
      const sharePct = Number(booking?.distributor_share_pct) || 50;
      const maintRate = Number(booking?.theatres?.maintenance_per_ticket) || 5;
      const distShareP = Math.round(netP * sharePct / 100);
      const maintP = Math.round((totalTix - cdrs.reduce((a: number, c: any) => a + (c.comp_qty || 0), 0)) * maintRate * 100);
      const netPayP = distShareP - maintP - bmsP - distP;

      const filmName = booking?.films?.title || "FILM";
      const theatreName = booking?.theatres?.name || "THR";
      const weekNum = Math.ceil((new Date(genForm.end).getTime() - new Date(genForm.start).getTime()) / 604800000) || 1;
      const settlNo = filmName.slice(0, 3).toUpperCase() + "-" + theatreName.slice(0, 3).toUpperCase() + "-W" + weekNum;

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("prd_settlements").insert({
        settlement_no: settlNo, theatre_booking_id: genForm.booking_id,
        period_start: genForm.start, period_end: genForm.end,
        total_tickets: totalTix, gross_collection_paise: grossP, gst_paise: gstP,
        net_collection_paise: netP, distributor_share_paise: distShareP,
        maintenance_paise: maintP, bms_commission_paise: bmsP, district_commission_paise: distP,
        net_payable_paise: netPayP, status: "draft", generated_by: user?.id,
        payment_due_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
      });

      if (error) throw new Error(error.message);
      toast.success("Settlement generated: " + settlNo + " — " + fmtINR(netPayP / 100));
      setShowGen(false); load();
    } catch (err: any) { toast.error(err.message); }
    setGenerating(false);
  }

  function handleNav(id: string) {
    if (id === "dash") navigate("/distributor");
    if (id === "films") navigate("/distributor/films");
    if (id === "thr") navigate("/distributor/theatres");
    if (id === "sett") navigate("/distributor/settlements");
    if (id === "rep") navigate("/distributor/reports");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="sett" onNav={handleNav} role="distributor" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader title="Settlements" sub="Generate and track theatre payments" breadcrumb={["Distributor", "Settlements"]}
          actions={<button className="btn btn-primary btn-sm" onClick={() => setShowGen(!showGen)}>+ Generate settlement</button>} />

        {showGen && <div style={{ padding: "14px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px auto", gap: 8, alignItems: "end" }}>
            <div><label className="label">Theatre booking *</label>
              <select className="input" value={genForm.booking_id} onChange={e => setGenForm({ ...genForm, booking_id: e.target.value })} style={{ height: 36 }}>
                {bookings.map((b: any) => <option key={b.id} value={b.id}>{b.theatres?.name} — {b.films?.title}</option>)}
              </select></div>
            <div><label className="label">From *</label><input className="input" type="date" value={genForm.start} onChange={e => setGenForm({ ...genForm, start: e.target.value })} /></div>
            <div><label className="label">To *</label><input className="input" type="date" value={genForm.end} onChange={e => setGenForm({ ...genForm, end: e.target.value })} /></div>
            <button className="btn btn-primary" onClick={generate} disabled={generating} style={{ height: 36 }}>{generating ? "Computing..." : "Generate"}</button>
          </div>
        </div>}

        <div style={{ padding: 24 }}>
          {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading...</div> :
          settlements.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48 }}>
              <Icon name="receipt" size={32} color="var(--ink-4)" />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>No settlements yet</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>Click "+ Generate settlement" to create one from approved CDRs.</div>
            </div>
          ) : <table className="tbl">
            <thead><tr><th>Settlement #</th><th>Theatre</th><th>Film</th><th>Period</th><th className="num">Tickets</th><th className="num">Gross</th><th className="num">Net payable</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>{settlements.map((s: any) => (
              <tr key={s.id}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{s.settlement_no}</td>
                <td>{s.theatre_bookings?.theatres?.name || "-"}</td>
                <td>{s.theatre_bookings?.films?.title || "-"}</td>
                <td>{s.period_start ? new Date(s.period_start).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " – " + new Date(s.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "-"}</td>
                <td className="num">{fmtQty(s.total_tickets)}</td>
                <td className="num">{fmtINR(s.gross_collection_paise / 100)}</td>
                <td className="num" style={{ fontWeight: 700 }}>{fmtINR(s.net_payable_paise / 100)}</td>
                <td>{s.payment_due_date ? new Date(s.payment_due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "-"}</td>
                <td><StatusBadge status={s.status} /></td>
              </tr>
            ))}</tbody>
          </table>}
        </div>
      </main>
    </div>
  );
}
