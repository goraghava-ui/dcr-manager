import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { StatusBadge, Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

interface Theatre { id: string; name: string; location: string; city: string; total_seats: number; number_of_screens: number; }

export default function DistributorTheatresPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTheatres(); }, []);

  async function loadTheatres() {
    try {
      const { data, error } = await (supabase as any).from("theatres").select("*").order("name");
      if (error) throw new Error(error.message);
      setTheatres(data || []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
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
      <Sidebar active="thr" onNav={handleNav} role="distributor" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader title="Theatres" sub="Contracted theatre network" breadcrumb={["Distributor", "Theatres"]} />
        <div style={{ padding: 24 }}>
          {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading…</div> :
          theatres.length === 0 ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>No theatres found.</div> :
          <table className="tbl">
            <thead><tr><th>Theatre</th><th>City</th><th>Location</th><th className="num">Seats</th><th className="num">Screens</th></tr></thead>
            <tbody>
              {theatres.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td>{t.city || "—"}</td>
                  <td>{t.location || "—"}</td>
                  <td className="num">{t.total_seats || "—"}</td>
                  <td className="num">{t.number_of_screens || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>
      </main>
    </div>
  );
}
