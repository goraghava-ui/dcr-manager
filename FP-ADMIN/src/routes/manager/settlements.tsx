import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR } from "../../lib/formatting";
import { useUserContext } from "../../hooks/useUserContext";
import { useToast } from "../../hooks/useToast";
import { StatusBadge, Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

interface Settlement {
  id: string; settlement_no: string; period_start: string; period_end: string;
  total_tickets: number; gross_collection_paise: number; net_payable_paise: number;
  status: string; payment_due_date: string;
}

export default function ManagerSettlementsPage() {
  const navigate = useNavigate();
  const uc = useUserContext();
  const toast = useToast();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!uc.loading && uc.bookingId) loadSettlements(); }, [uc.loading, uc.bookingId]);

  async function loadSettlements() {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any).from("prd_settlements").select("*")
        .eq("theatre_booking_id", uc.bookingId)
        .order("period_start", { ascending: false }).limit(20);
      if (error) throw new Error(error.message);
      setSettlements(data || []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  function handleNav(id: string) {
    if (id === "dash") navigate("/manager");
    if (id === "cdrs") navigate("/manager/cdrs");
    if (id === "sheet") navigate("/manager/daily-sheet");
    if (id === "exp") navigate("/manager/expenses");
    if (id === "sett") navigate("/manager/settlements");
    if (id === "rep") navigate("/manager/reports");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="sett" onNav={handleNav} role="manager" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader title="Settlements" sub={`Payments to distributor · ${uc.theatreName}`} breadcrumb={["Manager", "Settlements"]} />
        <div style={{ padding: 24 }}>
          {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading…</div> :
          settlements.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48 }}>
              <Icon name="receipt" size={32} color="var(--ink-4)" />
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12, color: "var(--ink-2)" }}>No settlements yet</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>Settlements will appear here once your distributor generates them.</div>
            </div>
          ) : (
          <table className="tbl">
            <thead><tr><th>Settlement #</th><th>Period</th><th className="num">Tickets</th><th className="num">Gross</th><th className="num">Net payable</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => navigate("/distributor/settlements")}>
                  <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: 12 }}>{s.settlement_no}</td>
                  <td>{new Date(s.period_start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(s.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  <td className="num">{s.total_tickets}</td>
                  <td className="num">{fmtINR(s.gross_collection_paise / 100)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{fmtINR(s.net_payable_paise / 100)}</td>
                  <td>{s.payment_due_date ? new Date(s.payment_due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</td>
                  <td><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>)}
        </div>
      </main>
    </div>
  );
}
