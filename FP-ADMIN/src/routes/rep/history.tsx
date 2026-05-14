import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { useUserContext } from "../../hooks/useUserContext";
import { useToast } from "../../hooks/useToast";
import { LogoLockup, StatusBadge, Icon } from "../../components/ui/shared";

interface CDRItem {
  id: string; show_date: string; show_number: number;
  total_qty: number; gross_collection_paise: number; status: string;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const uc = useUserContext();
  const toast = useToast();
  const [cdrs, setCdrs] = useState<CDRItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!uc.loading && uc.bookingId) loadHistory(); }, [uc.loading, uc.bookingId]);

  async function loadHistory() {
    try {
      setLoading(true);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const { data, error } = await (supabase as any).from("cdrs").select("id, show_date, show_number, total_qty, gross_collection_paise, status")
        .eq("theatre_booking_id", uc.bookingId)
        .gte("show_date", thirtyDaysAgo)
        .order("show_date", { ascending: false })
        .order("show_number");
      if (error) throw new Error(error.message);
      setCdrs(data || []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  // Group by date
  const grouped: Record<string, CDRItem[]> = {};
  cdrs.forEach(c => {
    const d = new Date(c.show_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(c);
  });

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/rep")} style={{ width: 30, padding: 0, justifyContent: "center" }}><Icon name="arrowL" size={16} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>History</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Past 30 days · {uc.theatreName}</div>
        </div>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading history…</div> :
        cdrs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Icon name="clock" size={32} color="var(--ink-4)" />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12, color: "var(--ink-2)" }}>No CDRs yet</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>Your submitted CDRs will appear here.</div>
          </div>
        ) : Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "8px 0", display: "flex", justifyContent: "space-between" }}>
              <span>{date}</span>
              <span>{fmtINR(items.reduce((a, c) => a + c.gross_collection_paise, 0) / 100)}</span>
            </div>
            {items.map(c => (
              <div key={c.id} className="app-card" onClick={() => navigate(`/rep/cdr/${c.show_number}`)}
                style={{ padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>
                  #{c.show_number}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Show {c.show_number}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{fmtQty(c.total_qty)} tickets · {fmtINR(c.gross_collection_paise / 100)}</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ position: "sticky", bottom: 0, background: "var(--surface)", borderTop: "1px solid var(--line)", display: "flex", padding: "8px 0" }}>
        {[
          { id: "home", icon: "home", label: "Home", active: false, path: "/rep" },
          { id: "new", icon: "plus", label: "New CDR", active: false, path: "/rep/cdr/1" },
          { id: "hist", icon: "clock", label: "History", active: true, path: "/rep/history" },
          { id: "me", icon: "logout", label: "Logout", active: false, path: "/logout" },
        ].map(t => (
          <div key={t.id} onClick={() => navigate(t.path)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            color: t.active ? "var(--accent)" : "var(--ink-3)", fontSize: 11, fontWeight: t.active ? 600 : 500, cursor: "pointer",
          }}><Icon name={t.icon} size={20} /><span>{t.label}</span></div>
        ))}
      </div>
    </div>
  );
}
