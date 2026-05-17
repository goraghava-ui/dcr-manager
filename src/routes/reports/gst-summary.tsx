import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR } from "../../lib/formatting";
import { exportGSTSummary } from "../../lib/excel-export";
import { Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";
import { useToast } from "../../hooks/useToast";

interface GSTRow { date: string; theatre: string; gross: number; gst18: number; gst12: number; cgst: number; sgst: number; total: number; }

export default function GSTSummaryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<GSTRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadGST(); }, []);

  async function loadGST() {
    setLoading(true);
    try {
      const { data: bookings } = await (supabase as any).from("theatre_bookings")
        .select("id, theatres(name)").eq("is_active", true);
      if (!bookings?.length) { setData([]); setLoading(false); return; }

      const ids = bookings.map((b: any) => b.id);
      const { data: cdrs } = await (supabase as any).from("cdrs")
        .select("theatre_booking_id, show_date, gross_collection_paise, gst_paise")
        .in("theatre_booking_id", ids)
        .in("status", ["approved", "submitted"])
        .order("show_date");

      // Group by date + theatre
      const grouped: Record<string, GSTRow> = {};
      (cdrs || []).forEach((c: any) => {
        const theatre = bookings.find((b: any) => b.id === c.theatre_booking_id)?.theatres?.name || "-";
        const key = c.show_date + "|" + theatre;
        if (!grouped[key]) grouped[key] = { date: c.show_date, theatre, gross: 0, gst18: 0, gst12: 0, cgst: 0, sgst: 0, total: 0 };
        const g = grouped[key];
        const gross = c.gross_collection_paise / 100;
        const gst = c.gst_paise / 100;
        g.gross += gross;
        g.gst18 += gst; // Simplified — real split needs class-level data
        g.cgst += gst / 2;
        g.sgst += gst / 2;
        g.total += gst;
      });

      setData(Object.values(grouped));
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  }

  const totals = data.reduce((a, d) => ({ gross: a.gross + d.gross, gst18: a.gst18 + d.gst18, cgst: a.cgst + d.cgst, sgst: a.sgst + d.sgst, total: a.total + d.total }), { gross: 0, gst18: 0, cgst: 0, sgst: 0, total: 0 });

  function handleNav(id: string) {
    if (id === "dash") navigate("/distributor");
    if (id === "films") navigate("/distributor/films");
    if (id === "thr") navigate("/distributor/theatres");
    if (id === "sett") navigate("/distributor/settlements");
    if (id === "rep") navigate("/distributor/reports");
  }

  function handleExport() {
    exportGSTSummary({
      period: "All",
      entries: data.map(d => ({
        date: d.date, theatre: d.theatre, grossPaise: Math.round(d.gross * 100),
        gstRate: 0.18, taxablePaise: Math.round(d.gross / 1.18 * 100),
        cgstPaise: Math.round(d.cgst * 100), sgstPaise: Math.round(d.sgst * 100),
        totalGstPaise: Math.round(d.total * 100),
      })),
    });
    toast.success("GST summary exported");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="rep" onNav={handleNav} role="distributor" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader title="GST Summary" sub="CGST + SGST breakdown · Filing-ready" breadcrumb={["Reports", "GST"]}
          actions={<button className="btn btn-primary btn-sm" onClick={handleExport}><Icon name="download" size={13} /> Export Excel</button>} />
        <div style={{ padding: 24 }}>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            {[{ l: "Total gross", v: totals.gross }, { l: "Total GST", v: totals.total }, { l: "CGST (9%)", v: totals.cgst }, { l: "SGST (9%)", v: totals.sgst }].map(c => (
              <div key={c.l} className="app-card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{c.l}</div>
                <div className="tnum" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{fmtINR(Math.round(c.v))}</div>
              </div>
            ))}
          </div>

          {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading GST data...</div> :
          data.length === 0 ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>No CDR data yet. GST summary will populate as theatres submit CDRs.</div> :
          <div className="app-card" style={{ overflow: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Date</th><th>Theatre</th><th className="num">Gross</th><th className="num">GST (18%)</th><th className="num">CGST</th><th className="num">SGST</th><th className="num">Total GST</th></tr></thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={i}>
                    <td>{new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                    <td style={{ fontWeight: 600 }}>{d.theatre}</td>
                    <td className="num">{fmtINR(Math.round(d.gross))}</td>
                    <td className="num">{fmtINR(Math.round(d.gst18))}</td>
                    <td className="num">{fmtINR(Math.round(d.cgst))}</td>
                    <td className="num">{fmtINR(Math.round(d.sgst))}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtINR(Math.round(d.total))}</td>
                  </tr>
                ))}
                <tr style={{ background: "var(--bg-soft)", fontWeight: 700 }}>
                  <td colSpan={2}>Total</td>
                  <td className="num">{fmtINR(Math.round(totals.gross))}</td>
                  <td className="num">{fmtINR(Math.round(totals.gst18))}</td>
                  <td className="num">{fmtINR(Math.round(totals.cgst))}</td>
                  <td className="num">{fmtINR(Math.round(totals.sgst))}</td>
                  <td className="num">{fmtINR(Math.round(totals.total))}</td>
                </tr>
              </tbody>
            </table>
          </div>}
        </div>
      </main>
    </div>
  );
}
