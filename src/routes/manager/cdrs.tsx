import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { useUserContext } from "../../hooks/useUserContext";
import { useToast } from "../../hooks/useToast";
import { StatusBadge, Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

interface CDRRow {
  id: string; show_date: string; show_number: number; show_timing: string;
  total_qty: number; gross_collection_paise: number; net_collection_paise: number;
  status: string; submitted_at: string;
}

export default function ManagerCDRsPage() {
  const navigate = useNavigate();
  const uc = useUserContext();
  const toast = useToast();
  const [cdrs, setCdrs] = useState<CDRRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { if (!uc.loading && uc.bookingId) loadCDRs(); }, [uc.loading, uc.bookingId]);

  async function loadCDRs() {
    try {
      setLoading(true);
      let q = (supabase as any).from("cdrs").select("*")
        .eq("theatre_booking_id", uc.bookingId)
        .order("show_date", { ascending: false })
        .order("show_number")
        .limit(100);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      setCdrs(data || []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (uc.bookingId) loadCDRs(); }, [statusFilter]);

  async function handleApprove(id: string) {
    const { error } = await (supabase as any).from("cdrs")
      .update({ status: "approved", approved_by: uc.userId, approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("CDR approved");
    loadCDRs();
  }

  function handleNav(id: string) {
    if (id === "dash") navigate("/manager");
    if (id === "cdrs") navigate("/manager/cdrs");
    if (id === "sheet") navigate("/manager/daily-sheet");
    if (id === "exp") navigate("/manager/expenses");
    if (id === "sett") navigate("/manager/settlements");
    if (id === "rep") navigate("/manager/reports");
  }

  const grouped: Record<string, CDRRow[]> = {};
  cdrs.forEach(c => {
    const d = new Date(c.show_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(c);
  });

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="cdrs" onNav={handleNav} role="manager" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader title="CDRs" sub={`${uc.theatreName} · ${uc.filmTitle || "Film"}`} breadcrumb={["Manager", "CDRs"]}
          actions={<div style={{ display: "flex", gap: 6 }}>
            {["all","submitted","approved","rejected","draft"].map(s => (
              <button key={s} className={`btn btn-sm ${statusFilter === s ? "btn-primary" : ""}`}
                onClick={() => setStatusFilter(s)}>{s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}</button>
            ))}
          </div>} />
        <div style={{ padding: 24 }}>
          {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading CDRs…</div> :
          cdrs.length === 0 ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>No CDRs found.</div> :
          <table className="tbl">
            <thead><tr><th>Date</th><th>Show</th><th className="num">Tickets</th><th className="num">Gross</th><th className="num">Net</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {cdrs.map(c => (
                <tr key={c.id}>
                  <td>{new Date(c.show_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  <td style={{ fontWeight: 600 }}>#{c.show_number}</td>
                  <td className="num">{fmtQty(c.total_qty)}</td>
                  <td className="num">{fmtINR(c.gross_collection_paise / 100)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmtINR(c.net_collection_paise / 100)}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="num">
                    {c.status === "submitted" && <button className="btn btn-primary btn-sm" onClick={() => handleApprove(c.id)}>Approve</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>
      </main>
    </div>
  );
}
