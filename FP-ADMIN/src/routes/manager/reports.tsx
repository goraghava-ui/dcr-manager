import { useNavigate } from "react-router-dom";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { useUserContext } from "../../hooks/useUserContext";
import { Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

const MGR_REPORTS = [
  { id: "pl", name: "Theatre P&L", desc: "Daily gross → GST → net → shares", icon: "chart" },
  { id: "gst", name: "GST summary", desc: "CGST + SGST filing-ready", icon: "receipt" },
  { id: "channel", name: "Channel split", desc: "BMS vs District vs Counter", icon: "grid" },
  { id: "expense", name: "Expense register", desc: "Category-wise, monthly", icon: "download" },
  { id: "aging", name: "Settlement status", desc: "Pending/paid settlements to distributor", icon: "clock" },
  { id: "audit", name: "Audit log", desc: "CDR edits and approvals", icon: "eye" },
];

export default function ManagerReportsPage() {
  const navigate = useNavigate();
  const uc = useUserContext();

  function handleNav(id: string) {
    if (id === "dash") navigate("/manager");
    if (id === "cdrs") navigate("/manager");
    if (id === "sheet") navigate("/manager/daily-sheet");
    if (id === "exp") navigate("/manager/expenses");
    if (id === "sett") navigate("/manager/reports");
    if (id === "rep") navigate("/manager/reports");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar active="rep" onNav={handleNav} role="manager" />
      <main style={{ flex: 1, overflow: "auto" }}>
        <PageHeader
          title="Reports"
          sub={`${uc.theatreName || "Theatre"} · Manager view`}
          breadcrumb={["Manager", "Reports"]}
        />
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {MGR_REPORTS.map(r => (
              <div key={r.id} className="app-card" style={{ padding: 14, cursor: "pointer" }}
                onClick={() => { if (r.id === "gst") navigate("/reports/gst"); }}>
                <Icon name={r.icon} size={16} color="var(--accent)" />
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{r.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 20, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            Manager reports show data for <b>{uc.theatreName || "your theatre"}</b> only. For multi-theatre reports, ask your distributor.
          </div>
        </div>
      </main>
    </div>
  );
}
