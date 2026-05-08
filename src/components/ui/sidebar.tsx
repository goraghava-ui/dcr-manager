import { LogoLockup, Icon } from "./shared";

interface SidebarProps {
  active: string;
  onNav?: (id: string) => void;
  role?: "manager" | "distributor";
}

export function Sidebar({ active, onNav, role = "manager" }: SidebarProps) {
  const navs = role === "manager" ? [
    { id: "dash", icon: "grid", label: "Dashboard" },
    { id: "cdrs", icon: "receipt", label: "CDRs", badge: 1 },
    { id: "sheet", icon: "film", label: "Daily Sheet" },
    { id: "exp", icon: "chart", label: "Expenses" },
    { id: "sett", icon: "download", label: "Settlements" },
    { id: "rep", icon: "chart", label: "Reports" },
  ] : [
    { id: "dash", icon: "grid", label: "Dashboard" },
    { id: "films", icon: "film", label: "Films" },
    { id: "thr", icon: "building", label: "Theatres" },
    { id: "sett", icon: "upload", label: "Settlements" },
    { id: "rep", icon: "chart", label: "Reports" },
  ];

  return (
    <aside style={{
      width: 220, background: "var(--bg-soft)", borderRight: "1px solid var(--line)",
      padding: "14px 10px", display: "flex", flexDirection: "column", gap: 14, flexShrink: 0,
    }}>
      <div style={{ padding: "4px 6px" }}><LogoLockup small /></div>
      <div style={{ position: "relative" }}>
        <Icon name="search" size={14} style={{ position: "absolute", top: 9, left: 8, color: "var(--ink-4)" }} />
        <input className="input" placeholder="Jump to…" style={{ paddingLeft: 28, height: 30, background: "var(--surface)" }} readOnly />
        <span className="kbd" style={{ position: "absolute", top: 7, right: 6 }}>⌘K</span>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px 4px" }}>Workspace</div>
        {navs.map(n => (
          <div key={n.id} className={"nav-item " + (active === n.id ? "active" : "")} onClick={() => onNav?.(n.id)}>
            <Icon name={n.icon} size={15} />
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.badge && <span className="badge b-submit" style={{ height: 16, padding: "0 5px", fontSize: 10 }}>{n.badge}</span>}
          </div>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <div className="hairline" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 100, background: "var(--accent)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600
        }}>{role === "manager" ? "SK" : "RR"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{role === "manager" ? "Suresh K." : "Raghavendra R."}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{role === "manager" ? "Sandhya 70mm" : "Friday Pictures"}</div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ width: 26, padding: 0, justifyContent: "center" }}><Icon name="settings" size={14} /></button>
      </div>
    </aside>
  );
}
