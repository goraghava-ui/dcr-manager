import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR } from "../../lib/formatting";
import { useToast } from "../../hooks/useToast";
import { StatusBadge, Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

interface Film { id: string; title: string; language: string; release_date: string; format: string; }

export default function DistributorFilmsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFilms(); }, []);

  async function loadFilms() {
    try {
      const { data, error } = await (supabase as any).from("films").select("*").order("release_date", { ascending: false });
      if (error) throw new Error(error.message);
      setFilms(data || []);
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

  const today = new Date();

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="films" onNav={handleNav} role="distributor" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader title="Films" sub="All distributed films" breadcrumb={["Distributor", "Films"]} />
        <div style={{ padding: 24 }}>
          {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading…</div> :
          films.length === 0 ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>No films found. Admin needs to add films.</div> :
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {films.map(f => {
              const released = f.release_date && new Date(f.release_date) <= today;
              const daysSince = f.release_date ? Math.max(0, Math.ceil((today.getTime() - new Date(f.release_date).getTime()) / 86400000)) : 0;
              return (
                <div key={f.id} className="app-card" style={{ padding: 16, display: "flex", gap: 12 }}>
                  <div style={{ width: 48, height: 64, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                    {f.title?.[0] || "F"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                      {f.language} · {f.format || "2D"}
                      {f.release_date && ` · ${new Date(f.release_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <StatusBadge status={released ? (daysSince > 60 ? "ended" : "approved") : "draft"} />
                      {released && daysSince <= 60 && <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: 6 }}>Day {daysSince + 1}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>}
        </div>
      </main>
    </div>
  );
}
