import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { LogoLockup, StatusBadge, Icon } from "../../components/ui/shared";

interface CDRRecord {
  id: string;
  showDate: string;
  showNumber: number;
  time: string;
  status: string;
  qty: number;
  gross: number;
  filmDay: number;
}

const SAMPLE_HISTORY: CDRRecord[] = [
  { id: "h1", showDate: "4 May", showNumber: 1, time: "11:00 AM", status: "approved", qty: 298, gross: 52400, filmDay: 7 },
  { id: "h2", showDate: "4 May", showNumber: 2, time: "02:30 PM", status: "approved", qty: 334, gross: 60200, filmDay: 7 },
  { id: "h3", showDate: "4 May", showNumber: 3, time: "06:30 PM", status: "approved", qty: 356, gross: 64800, filmDay: 7 },
  { id: "h4", showDate: "4 May", showNumber: 4, time: "10:00 PM", status: "approved", qty: 302, gross: 54000, filmDay: 7 },
  { id: "h5", showDate: "3 May", showNumber: 1, time: "11:00 AM", status: "approved", qty: 278, gross: 48600, filmDay: 6 },
  { id: "h6", showDate: "3 May", showNumber: 2, time: "02:30 PM", status: "approved", qty: 310, gross: 55800, filmDay: 6 },
  { id: "h7", showDate: "3 May", showNumber: 3, time: "06:30 PM", status: "approved", qty: 342, gross: 62100, filmDay: 6 },
  { id: "h8", showDate: "3 May", showNumber: 4, time: "10:00 PM", status: "approved", qty: 288, gross: 51200, filmDay: 6 },
  { id: "h9", showDate: "2 May", showNumber: 1, time: "11:00 AM", status: "approved", qty: 310, gross: 55400, filmDay: 5 },
  { id: "h10", showDate: "2 May", showNumber: 2, time: "02:30 PM", status: "approved", qty: 348, gross: 63100, filmDay: 5 },
  { id: "h11", showDate: "2 May", showNumber: 3, time: "06:30 PM", status: "approved", qty: 362, gross: 66200, filmDay: 5 },
  { id: "h12", showDate: "2 May", showNumber: 4, time: "10:00 PM", status: "rejected", qty: 320, gross: 57800, filmDay: 5 },
];

export default function HistoryPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const [records, setRecords] = useState<CDRRecord[]>(SAMPLE_HISTORY);

  const filtered = filter === "all" ? records : records.filter(r => r.status === filter);
  const groups = filtered.reduce<Record<string, CDRRecord[]>>((acc, r) => {
    (acc[r.showDate] = acc[r.showDate] || []).push(r); return acc;
  }, {});

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/rep")} style={{ width: 30, padding: 0, justifyContent: "center" }}>
          <Icon name="arrowL" size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>History</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Past 30 days · Sandhya 70mm</div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: 16 }}>
        <div className="app-card" style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <div className="m-label">Total CDRs</div>
            <div className="tnum" style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{records.length}</div>
          </div>
          <div>
            <div className="m-label">Approved</div>
            <div className="tnum" style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: "var(--ok)" }}>{records.filter(r => r.status === "approved").length}</div>
          </div>
          <div>
            <div className="m-label">Rejected</div>
            <div className="tnum" style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: "var(--bad)" }}>{records.filter(r => r.status === "rejected").length}</div>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: "0 16px", display: "flex", gap: 6 }}>
        {["all", "approved", "rejected", "submitted"].map(f => (
          <div key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 500, cursor: "pointer",
            border: "1px solid " + (filter === f ? "var(--accent)" : "var(--line-2)"),
            background: filter === f ? "var(--accent)" : "var(--surface)",
            color: filter === f ? "#fff" : "var(--ink-2)",
            textTransform: "capitalize",
          }}>{f === "all" ? "All" : f}</div>
        ))}
      </div>

      {/* Grouped list */}
      <div style={{ padding: "14px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {Object.entries(groups).map(([date, items]) => (
          <div key={date}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 4px 6px" }}>
              <span>{date} 2026 · Day {items[0].filmDay}</span>
              <span className="tnum">{fmtINR(items.reduce((a, r) => a + r.gross, 0))}</span>
            </div>
            <div className="app-card" style={{ overflow: "hidden" }}>
              {items.map((r, i) => (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none",
                }}>
                  <div style={{ width: 36, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--ink-4)" }}>S{r.showNumber}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{r.time.split(" ")[0]}</div>
                    <div style={{ fontSize: 9, color: "var(--ink-4)" }}>{r.time.split(" ")[1]}</div>
                  </div>
                  <div style={{ width: 1, height: 28, background: "var(--line)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{fmtQty(r.qty)} tickets · {fmtINR(r.gross)}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div style={{ flex: 1 }} />
      <div style={{ position: "sticky", bottom: 0, background: "var(--surface)", borderTop: "1px solid var(--line)", display: "flex", padding: "8px 0" }}>
        {[
          { id: "home", icon: "home", label: "Home", path: "/rep" },
          { id: "new", icon: "plus", label: "New CDR", path: "/rep/cdr/new" },
          { id: "hist", icon: "clock", label: "History", path: "/rep/history", active: true },
          { id: "me", icon: "logout", label: "Logout", path: "/logout" },
        ].map(t => (
          <div key={t.id} onClick={() => navigate(t.path)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            color: t.active ? "var(--accent)" : "var(--ink-3)", fontSize: 11,
            fontWeight: t.active ? 600 : 500, cursor: "pointer",
          }}>
            <Icon name={t.icon} size={20} /><span>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
