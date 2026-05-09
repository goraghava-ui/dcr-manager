import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { StatusBadge, Metric, Icon } from "../../components/ui/shared";
import { Sidebar } from "../../components/ui/sidebar";
import { PageHeader } from "../../components/ui/page-header";

type Tab = "theatres" | "films" | "users" | "config" | "audit";

const SAMPLE_THEATRES = [
  { id: "t1", name: "Sandhya 70mm", city: "Hyderabad", territory: "Nizam", capacity: 642, screens: 1, manager: "Suresh K.", active: true },
  { id: "t2", name: "Devi 70mm", city: "Hyderabad", territory: "Nizam", capacity: 580, screens: 1, manager: "Ravi P.", active: true },
  { id: "t3", name: "Sudarshan 35mm", city: "Secunderabad", territory: "Nizam", capacity: 480, screens: 1, manager: "Venkat M.", active: true },
  { id: "t4", name: "Sri Ramakrishna", city: "Karimnagar", territory: "Nizam", capacity: 420, screens: 1, manager: "Krishna R.", active: true },
  { id: "t5", name: "Laxmi Talkies", city: "Khammam", territory: "Nizam", capacity: 360, screens: 1, manager: "—", active: false },
];

const SAMPLE_FILMS = [
  { id: "f1", title: "Jungle", language: "Telugu", release: "28 Apr 2026", status: "running", theatres: 28 },
  { id: "f2", title: "Vetagadu", language: "Telugu", release: "15 Mar 2026", status: "ended", theatres: 22 },
  { id: "f3", title: "Magadheera 2", language: "Telugu", release: "12 Jun 2026", status: "upcoming", theatres: 0 },
];

const SAMPLE_USERS = [
  { id: "u1", name: "Ramesh K.", phone: "98765 43210", role: "rep", theatre: "Sandhya 70mm", active: true },
  { id: "u2", name: "Suresh K.", phone: "98765 43211", role: "manager", theatre: "Sandhya 70mm", active: true },
  { id: "u3", name: "Raghavendra R.", phone: "98765 43212", role: "distributor", theatre: "—", active: true },
  { id: "u4", name: "Kiran B.", phone: "90XXX XX112", role: "rep", theatre: "Laxmi Talkies", active: true },
  { id: "u5", name: "Ravi P.", phone: "91XXX XX445", role: "manager", theatre: "Devi 70mm", active: true },
  { id: "u6", name: "Admin User", phone: "98765 43213", role: "admin", theatre: "—", active: true },
];

const SAMPLE_AUDIT = [
  { id: "a1", ts: "5 May 14:32", user: "Suresh K.", action: "update", table: "cdrs", record: "Show #3", detail: "status: submitted → approved" },
  { id: "a2", ts: "5 May 14:18", user: "Ramesh K.", action: "create", table: "cdrs", record: "Show #3", detail: "CDR submitted — 358 tix, ₹65,620" },
  { id: "a3", ts: "5 May 11:45", user: "Suresh K.", action: "update", table: "cdrs", record: "Show #2", detail: "status: submitted → approved" },
  { id: "a4", ts: "5 May 11:30", user: "Ramesh K.", action: "create", table: "cdrs", record: "Show #2", detail: "CDR submitted — 348 tix, ₹63,100" },
  { id: "a5", ts: "5 May 09:20", user: "Suresh K.", action: "update", table: "cdrs", record: "Show #1", detail: "status: submitted → approved" },
  { id: "a6", ts: "5 May 09:05", user: "Ramesh K.", action: "create", table: "cdrs", record: "Show #1", detail: "CDR submitted — 312 tix, ₹56,240" },
  { id: "a7", ts: "4 May 22:10", user: "Admin User", action: "update", table: "theatre_pricing", record: "Sandhya 70mm", detail: "Premium price: ₹230 → ₹250 (effective 5 May)" },
  { id: "a8", ts: "4 May 18:00", user: "Raghavendra R.", action: "create", table: "settlements", record: "JNG-SDH-W1", detail: "Settlement generated — ₹5,84,200" },
];

const SAMPLE_CONFIG = [
  { key: "gst_rate_high", label: "GST rate (≥₹100 tickets)", value: "18%", detail: "CGST 9% + SGST 9%" },
  { key: "gst_rate_low", label: "GST rate (<₹100 tickets)", value: "12%", detail: "CGST 6% + SGST 6%" },
  { key: "default_maintenance", label: "Default maintenance/ticket", value: "₹5.00", detail: "Range ₹2–₹10, per theatre" },
  { key: "bms_commission", label: "BMS commission", value: "8%", detail: "Default, configurable per deal" },
  { key: "district_commission", label: "District commission", value: "5%", detail: "Default, configurable per deal" },
  { key: "settlement_period", label: "Settlement period", value: "Weekly", detail: "Monday to Sunday" },
  { key: "payment_terms", label: "Payment terms", value: "T+3", detail: "3 banking days from generation" },
  { key: "otp_lockout", label: "OTP lockout", value: "15 min", detail: "After 3 wrong attempts" },
  { key: "session_duration", label: "Session duration", value: "30 days", detail: "Refreshable" },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("theatres");

  function handleNav(id: string) {
    if (id === "dash") setTab("theatres");
    if (id === "thr") setTab("theatres");
    if (id === "films") setTab("films");
    if (id === "users") setTab("users");
    if (id === "audit") setTab("audit");
    if (id === "config") setTab("config");
  }

  const adminNavs = [
    { id: "thr", icon: "building", label: "Theatres" },
    { id: "films", icon: "film", label: "Films" },
    { id: "users", icon: "user", label: "Users" },
    { id: "config", icon: "settings", label: "System Config" },
    { id: "audit", icon: "eye", label: "Audit Log" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Custom admin sidebar */}
      <aside style={{
        width: 220, background: "var(--bg-soft)", borderRight: "1px solid var(--line)",
        padding: "14px 10px", display: "flex", flexDirection: "column", gap: 14, flexShrink: 0,
      }}>
        <div style={{ padding: "4px 6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="settings" size={20} color="var(--accent)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink-1)" }}>Admin Panel</div>
              <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginTop: 1 }}>Friday Pictures</div>
            </div>
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px 4px" }}>Master Data</div>
          {adminNavs.map(n => (
            <div key={n.id} className={"nav-item " + (tab === n.id.replace("thr", "theatres").replace("config", "config") ? "" : "") + (
              (n.id === "thr" && tab === "theatres") || (n.id === "config" && tab === "config") || (n.id === "audit" && tab === "audit") || (n.id === tab) ? "active" : ""
            )} onClick={() => handleNav(n.id)}>
              <Icon name={n.icon} size={15} />
              <span style={{ flex: 1 }}>{n.label}</span>
            </div>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <div className="hairline" />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px" }}>
          <div style={{ width: 28, height: 28, borderRadius: 100, background: "var(--bad)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Admin User</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>System admin</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/logout")} title="Logout"
            style={{ width: 26, padding: 0, justifyContent: "center" }}>
            <Icon name="logout" size={14} />
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>
        {tab === "theatres" && <TheatresTab />}
        {tab === "films" && <FilmsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "config" && <ConfigTab />}
        {tab === "audit" && <AuditTab />}
      </main>
    </div>
  );
}

function TheatresTab() {
  return (<>
    <PageHeader title="Theatres" sub="Add, edit, and manage theatre master data" breadcrumb={["Admin", "Theatres"]}
      actions={<button className="btn btn-primary btn-sm"><Icon name="plus" size={13} /> Add theatre</button>} />
    <div style={{ padding: 24 }}>
      <div className="app-card">
        <table className="tbl">
          <thead><tr><th>Theatre</th><th>City</th><th>Territory</th><th className="num">Capacity</th><th className="num">Screens</th><th>Manager</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {SAMPLE_THEATRES.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 500 }}>{t.name}</td>
                <td>{t.city}</td>
                <td>{t.territory}</td>
                <td className="num">{fmtQty(t.capacity)}</td>
                <td className="num">{t.screens}</td>
                <td style={{ color: t.manager === "—" ? "var(--ink-4)" : "var(--ink-2)" }}>{t.manager}</td>
                <td><StatusBadge status={t.active ? "approved" : "rejected"} /></td>
                <td className="num">
                  <button className="btn btn-ghost btn-sm"><Icon name="settings" size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>);
}

function FilmsTab() {
  return (<>
    <PageHeader title="Films" sub="Manage film releases and distribution assignments" breadcrumb={["Admin", "Films"]}
      actions={<button className="btn btn-primary btn-sm"><Icon name="plus" size={13} /> Add film</button>} />
    <div style={{ padding: 24 }}>
      <div className="app-card">
        <table className="tbl">
          <thead><tr><th>Film</th><th>Language</th><th>Release date</th><th className="num">Theatres</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {SAMPLE_FILMS.map(f => (
              <tr key={f.id}>
                <td style={{ fontWeight: 600 }}>{f.title}</td>
                <td>{f.language}</td>
                <td>{f.release}</td>
                <td className="num">{f.theatres}</td>
                <td><StatusBadge status={f.status === "running" ? "approved" : f.status === "upcoming" ? "draft" : "pending"} /></td>
                <td className="num"><button className="btn btn-ghost btn-sm"><Icon name="settings" size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>);
}

function UsersTab() {
  return (<>
    <PageHeader title="Users" sub="Manage reps, managers, distributors, and producers" breadcrumb={["Admin", "Users"]}
      actions={<button className="btn btn-primary btn-sm"><Icon name="plus" size={13} /> Add user</button>} />
    <div style={{ padding: 24 }}>
      <div className="app-card">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Theatre</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {SAMPLE_USERS.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>+91 {u.phone}</td>
                <td>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500,
                    background: u.role === "admin" ? "var(--bad-soft)" : u.role === "distributor" ? "var(--warn-soft)" : u.role === "manager" ? "var(--accent-soft)" : "var(--bg-soft)",
                    color: u.role === "admin" ? "var(--bad)" : u.role === "distributor" ? "var(--warn)" : u.role === "manager" ? "var(--accent)" : "var(--ink-2)",
                    textTransform: "capitalize",
                  }}>{u.role}</span>
                </td>
                <td style={{ color: u.theatre === "—" ? "var(--ink-4)" : "var(--ink-2)" }}>{u.theatre}</td>
                <td><StatusBadge status={u.active ? "approved" : "rejected"} /></td>
                <td className="num"><button className="btn btn-ghost btn-sm"><Icon name="settings" size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>);
}

function ConfigTab() {
  return (<>
    <PageHeader title="System Configuration" sub="GST rates, commission defaults, settlement terms" breadcrumb={["Admin", "Config"]} />
    <div style={{ padding: 24 }}>
      <div className="app-card" style={{ overflow: "hidden" }}>
        {SAMPLE_CONFIG.map((c, i) => (
          <div key={c.key} style={{
            display: "flex", alignItems: "center", gap: 16, padding: "14px 16px",
            borderBottom: i < SAMPLE_CONFIG.length - 1 ? "1px solid var(--line)" : "none",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{c.detail}</div>
            </div>
            <div className="tnum" style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)", minWidth: 80, textAlign: "right" }}>{c.value}</div>
            <button className="btn btn-ghost btn-sm"><Icon name="settings" size={13} /></button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Pricing Matrix — Sandhya 70mm</div>
        <div className="app-card">
          <table className="tbl">
            <thead><tr><th>Class</th><th className="num">Price (₹)</th><th className="num">Sno from</th><th className="num">Sno to</th><th className="num">Capacity</th><th>GST slab</th><th>Effective from</th><th></th></tr></thead>
            <tbody>
              {[
                { cls: "Premium", price: 250, from: 1, to: 168, cap: 168, gst: "18%", eff: "1 Jan 2026" },
                { cls: "Balcony", price: 180, from: 169, to: 310, cap: 142, gst: "18%", eff: "1 Jan 2026" },
                { cls: "1st class", price: 120, from: 311, to: 468, cap: 158, gst: "18%", eff: "1 Jan 2026" },
                { cls: "2nd class", price: 80, from: 469, to: 642, cap: 174, gst: "12%", eff: "1 Jan 2026" },
              ].map(r => (
                <tr key={r.cls}>
                  <td style={{ fontWeight: 500 }}>{r.cls}</td>
                  <td className="num">{fmtINR(r.price)}</td>
                  <td className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.from}</td>
                  <td className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.to}</td>
                  <td className="num">{r.cap}</td>
                  <td><span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 11, background: r.gst === "18%" ? "var(--accent-soft)" : "var(--warn-soft)", color: r.gst === "18%" ? "var(--accent)" : "var(--warn)" }}>{r.gst}</span></td>
                  <td style={{ color: "var(--ink-3)", fontSize: 12 }}>{r.eff}</td>
                  <td className="num"><button className="btn btn-ghost btn-sm"><Icon name="settings" size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </>);
}

function AuditTab() {
  return (<>
    <PageHeader title="Audit Log" sub="Every edit, delete, and status change — tamper-proof, insert-only" breadcrumb={["Admin", "Audit Log"]}
      actions={<>
        <input className="input" style={{ width: 200, height: 28, fontSize: 12 }} placeholder="Search actions…" readOnly />
        <button className="btn btn-sm"><Icon name="download" size={13} /> Export</button>
      </>}
    />
    <div style={{ padding: 24 }}>
      <div className="app-card">
        <table className="tbl">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Table</th><th>Record</th><th>Detail</th></tr></thead>
          <tbody>
            {SAMPLE_AUDIT.map(a => (
              <tr key={a.id}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}>{a.ts}</td>
                <td style={{ fontWeight: 500 }}>{a.user}</td>
                <td>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500,
                    background: a.action === "create" ? "var(--ok-soft)" : a.action === "update" ? "var(--accent-soft)" : "var(--bad-soft)",
                    color: a.action === "create" ? "var(--ok)" : a.action === "update" ? "var(--accent)" : "var(--bad)",
                  }}>{a.action}</span>
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{a.table}</td>
                <td>{a.record}</td>
                <td style={{ color: "var(--ink-2)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>);
}
