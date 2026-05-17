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
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any).from("prd_settlements")
      .select("*, theatre_bookings(theatres(name), films(title))")
      .order("created_at", { ascending: false }).limit(50);
    if (error) toast.error(error.message);
    setSettlements(data || []);
    setLoading(false);
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
        <PageHeader title="Settlements" sub="Theatre payment statements" breadcrumb={["Distributor", "Settlements"]} />
        <div style={{ padding: 24 }}>
          {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading...</div> :
          settlements.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48 }}>
              <Icon name="receipt" size={32} color="var(--ink-4)" />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12, color: "var(--ink-2)" }}>No settlements generated yet</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, maxWidth: 400, margin: "6px auto 0" }}>
                Settlements will appear here once CDRs are approved and a settlement period is generated. This feature is coming soon.
              </div>
            </div>
          ) : (
          <table className="tbl">
            <thead><tr><th>Settlement #</th><th>Theatre</th><th>Film</th><th>Period</th><th className="num">Tickets</th><th className="num">Gross</th><th className="num">Net payable</th><th>Status</th></tr></thead>
            <tbody>
              {settlements.map((s: any) => (
                <tr key={s.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{s.settlement_no}</td>
                  <td>{s.theatre_bookings?.theatres?.name || "-"}</td>
                  <td>{s.theatre_bookings?.films?.title || "-"}</td>
                  <td>{s.period_start && s.period_end ? `${new Date(s.period_start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(s.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "-"}</td>
                  <td className="num">{fmtQty(s.total_tickets)}</td>
                  <td className="num">{fmtINR(s.gross_collection_paise / 100)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{fmtINR(s.net_payable_paise / 100)}</td>
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
