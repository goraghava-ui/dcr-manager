import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { Icon } from "../../components/ui/shared";
import { PageHeader } from "../../components/ui/page-header";

type Tab = "theatres" | "films" | "users" | "config" | "audit";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("theatres");
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 220, background: "var(--bg-soft)", borderRight: "1px solid var(--line)", padding: "14px 10px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        <div style={{ padding: "8px 10px", fontWeight: 700, fontSize: 14 }}>Admin Panel</div>
        <div className="hairline" />
        {(["theatres","films","users","config","audit"] as Tab[]).map(t => (
          <div key={t} className={"nav-item " + (tab === t ? "active" : "")} onClick={() => setTab(t)} style={{ cursor: "pointer", textTransform: "capitalize" }}>
            <Icon name={t === "theatres" ? "building" : t === "films" ? "film" : t === "users" ? "user" : t === "config" ? "settings" : "eye"} size={15} />
            <span>{t}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/logout")} style={{ justifyContent: "flex-start", gap: 8 }}>
          <Icon name="logout" size={14} /> Logout
        </button>
      </aside>
      <main style={{ flex: 1, overflow: "auto" }}>
        {tab === "theatres" && <TheatresTab toast={toast} />}
        {tab === "films" && <FilmsTab toast={toast} />}
        {tab === "users" && <UsersTab toast={toast} />}
        {tab === "config" && <ConfigTab toast={toast} />}
        {tab === "audit" && <AuditTab />}
      </main>
    </div>
  );
}
function TheatresTab({ toast }: { toast: any }) {
  const [data, setData] = useState<any[]>([]);
  const [ld, setLd] = useState(true);
  const [sf, setSf] = useState(false);
  const [fm, setFm] = useState({ name: "", city: "", location: "", total_seats: "", number_of_screens: "1" });
  const [sv, setSv] = useState(false);
  useEffect(() => { load(); }, []);
  async function load() { setLd(true); const { data: d } = await (supabase as any).from("theatres").select("*").order("name"); setData(d || []); setLd(false); }
  async function handleAdd() {
    if (!fm.name.trim() || !fm.city.trim()) { toast.warning("Name and City required"); return; }
    setSv(true);
    const { error } = await (supabase as any).from("theatres").insert({ name: fm.name.trim(), city: fm.city.trim(), location: fm.location.trim(), total_seats: parseInt(fm.total_seats) || 0, number_of_screens: parseInt(fm.number_of_screens) || 1 });
    setSv(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Theatre added: " + fm.name);
    setFm({ name: "", city: "", location: "", total_seats: "", number_of_screens: "1" }); setSf(false); load();
  }
  return (<div>
    <PageHeader title="Theatres" sub={data.length + " theatres"} actions={<button className="btn btn-primary btn-sm" onClick={() => setSf(!sf)}>+ Add Theatre</button>} />
    {sf && <div style={{ padding: "16px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 100px 80px auto", gap: 8, alignItems: "end" }}>
        <div><label className="label">Name *</label><input className="input" value={fm.name} onChange={e => setFm({...fm, name: e.target.value})} placeholder="Sandhya 70mm" /></div>
        <div><label className="label">City *</label><input className="input" value={fm.city} onChange={e => setFm({...fm, city: e.target.value})} placeholder="Hyderabad" /></div>
        <div><label className="label">Location</label><input className="input" value={fm.location} onChange={e => setFm({...fm, location: e.target.value})} /></div>
        <div><label className="label">Seats</label><input className="input" type="number" value={fm.total_seats} onChange={e => setFm({...fm, total_seats: e.target.value})} /></div>
        <div><label className="label">Screens</label><input className="input" type="number" value={fm.number_of_screens} onChange={e => setFm({...fm, number_of_screens: e.target.value})} /></div>
        <button className="btn btn-primary" onClick={handleAdd} disabled={sv} style={{ height: 36 }}>{sv ? "..." : "Add"}</button>
      </div>
    </div>}
    <div style={{ padding: 24 }}>{ld ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading...</div> :
      <table className="tbl"><thead><tr><th>Name</th><th>City</th><th>Location</th><th className="num">Seats</th><th className="num">Screens</th></tr></thead>
        <tbody>{data.map((r: any) => <tr key={r.id}><td style={{ fontWeight: 600 }}>{r.name}</td><td>{r.city || "-"}</td><td>{r.location || "-"}</td><td className="num">{r.total_seats || "-"}</td><td className="num">{r.number_of_screens || 1}</td></tr>)}
        {data.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--ink-3)", padding: 24 }}>No theatres yet.</td></tr>}</tbody></table>}</div>
  </div>);
}
function FilmsTab({ toast }: { toast: any }) {
  const [data, setData] = useState<any[]>([]);
  const [ld, setLd] = useState(true);
  const [sf, setSf] = useState(false);
  const [fm, setFm] = useState({ title: "", language: "Telugu", release_date: "", format: "2D" });
  const [sv, setSv] = useState(false);
  useEffect(() => { load(); }, []);
  async function load() { setLd(true); const { data: d } = await (supabase as any).from("films").select("*").order("created_at", { ascending: false }); setData(d || []); setLd(false); }
  async function handleAdd() {
    if (!fm.title.trim()) { toast.warning("Title required"); return; }
    setSv(true);
    const { error } = await (supabase as any).from("films").insert({ title: fm.title.trim(), language: fm.language, format: fm.format, release_date: fm.release_date || null });
    setSv(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Film added: " + fm.title);
    setFm({ title: "", language: "Telugu", release_date: "", format: "2D" }); setSf(false); load();
  }
  return (<div>
    <PageHeader title="Films" sub={data.length + " films"} actions={<button className="btn btn-primary btn-sm" onClick={() => setSf(!sf)}>+ Add Film</button>} />
    {sf && <div style={{ padding: "16px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 120px 140px 100px auto", gap: 8, alignItems: "end" }}>
        <div><label className="label">Title *</label><input className="input" value={fm.title} onChange={e => setFm({...fm, title: e.target.value})} placeholder="Jungle" /></div>
        <div><label className="label">Language</label><select className="input" value={fm.language} onChange={e => setFm({...fm, language: e.target.value})} style={{ height: 36 }}><option>Telugu</option><option>Hindi</option><option>Tamil</option></select></div>
        <div><label className="label">Release date</label><input className="input" type="date" value={fm.release_date} onChange={e => setFm({...fm, release_date: e.target.value})} /></div>
        <div><label className="label">Format</label><select className="input" value={fm.format} onChange={e => setFm({...fm, format: e.target.value})} style={{ height: 36 }}><option>2D</option><option>3D</option><option>IMAX</option></select></div>
        <button className="btn btn-primary" onClick={handleAdd} disabled={sv} style={{ height: 36 }}>{sv as any ? "..." : "Add"}</button>
      </div>
    </div>}
    <div style={{ padding: 24 }}>{ld ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading...</div> :
      <table className="tbl"><thead><tr><th>Title</th><th>Language</th><th>Format</th><th>Release</th></tr></thead>
        <tbody>{data.map((f: any) => <tr key={f.id}><td style={{ fontWeight: 600 }}>{f.title}</td><td>{f.language}</td><td>{f.format || "2D"}</td><td>{f.release_date ? new Date(f.release_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td></tr>)}</tbody></table>}</div>
  </div>);
}
function UsersTab({ toast }: { toast: any }) {
  const [data, setData] = useState<any[]>([]);
  const [ld, setLd] = useState(true);
  const [sf, setSf] = useState(false);
  const [fm, setFm] = useState({ name: "", phone: "", role: "rep" });
  const [sv, setSv] = useState(false);
  useEffect(() => { load(); }, []);
  async function load() { setLd(true); const { data: d } = await (supabase as any).from("profiles").select("*").order("created_at", { ascending: false }); setData(d || []); setLd(false); }
  async function handleAdd() {
    if (!fm.name.trim() || !fm.phone.trim()) { toast.warning("Name and Phone required"); return; }
    setSv(true);
    const { error } = await (supabase as any).from("users").insert({ id: crypto.randomUUID(), name: fm.name.trim(), phone: fm.phone.replace(/\s/g, "").slice(-10), role: fm.role, is_active: true });
    setSv(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("User added: " + fm.name);
    setFm({ name: "", phone: "", role: "rep" }); setSf(false); load();
  }
  const rc: Record<string, string> = { representative: "var(--accent)", exhibitor: "var(--ok)", distributor: "#9b59b6", producer: "#e6a817", admin: "var(--bad)" };
  return (<div>
    <PageHeader title="Users" sub={data.length + " users"} actions={<button className="btn btn-primary btn-sm" onClick={() => setSf(!sf)}>+ Add User</button>} />
    {sf && <div style={{ padding: "16px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 150px auto", gap: 8, alignItems: "end" }}>
        <div><label className="label">Name *</label><input className="input" value={fm.name} onChange={e => setFm({...fm, name: e.target.value})} placeholder="Ramesh K." /></div>
        <div><label className="label">Phone *</label><input className="input" value={fm.phone} onChange={e => setFm({...fm, phone: e.target.value})} placeholder="9876543210" maxLength={10} /></div>
        <div><label className="label">Role</label><select className="input" value={fm.role} onChange={e => setFm({...fm, role: e.target.value})} style={{ height: 36 }}><option value="rep">Rep</option><option value="manager">Manager</option><option value="distributor">Distributor</option><option value="producer">Producer</option><option value="admin">Admin</option></select></div>
        <button className="btn btn-primary" onClick={handleAdd} disabled={sv} style={{ height: 36 }}>{sv as any ? "..." : "Add"}</button>
      </div>
    </div>}
    <div style={{ padding: 24 }}>{ld ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading...</div> :
      <table className="tbl"><thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Active</th></tr></thead>
        <tbody>{data.map((u: any) => <tr key={u.id}><td style={{ fontWeight: 600 }}>{u.name || "-"}</td><td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{u.phone || "-"}</td><td><span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: `color-mix(in oklab, ${rc[u.role] || "var(--ink-3)"} 15%, transparent)`, color: rc[u.role] || "var(--ink-3)" }}>{u.role}</span></td><td>{u.is_active !== false ? "Active" : "Inactive"}</td></tr>)}</tbody></table>}</div>
  </div>);
}
function ConfigTab({ toast }: { toast: any }) {
  const [cfg, setCfg] = useState<any>({ gst_high: 18, gst_low: 12, bms: 8, dist: 5, maint: 5, terms: 3 });
  const [sv, setSv] = useState(false);
  async function save() { setSv(true); for (const [k, v] of Object.entries(cfg)) { await (supabase as any).from("system_config").upsert({ key: k, value: JSON.stringify(v) }, { onConflict: "key" }); } setSv(false); toast.success("Config saved"); }
  const fields = [{ k: "gst_high", l: "GST (>=100)", s: "%" }, { k: "gst_low", l: "GST (<100)", s: "%" }, { k: "bms", l: "BMS commission", s: "%" }, { k: "dist", l: "District commission", s: "%" }, { k: "maint", l: "Maintenance/ticket", s: "Rs" }, { k: "terms", l: "Payment terms", s: "days" }];
  return (<div>
    <PageHeader title="System Config" sub="GST, commissions, terms" actions={<button className="btn btn-primary btn-sm" onClick={save} disabled={sv}>{sv as any ? "Saving..." : "Save Config"}</button>} />
    <div style={{ padding: 24, maxWidth: 500 }}>{fields.map(f => <div key={f.k} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><label style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{f.l}</label><input className="input" type="number" style={{ width: 80, textAlign: "right" }} value={cfg[f.k]} onChange={e => setCfg({ ...cfg, [f.k]: parseFloat(e.target.value) || 0 })} onFocus={e => e.target.select()} /><span style={{ fontSize: 12, color: "var(--ink-3)", width: 30 }}>{f.s}</span></div>)}</div>
  </div>);
}
function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [ld, setLd] = useState(true);
  useEffect(() => { (supabase as any).from("prd_audit_logs").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }: any) => { setLogs(data || []); setLd(false); }); }, []);
  return (<div>
    <PageHeader title="Audit Log" sub="All changes tracked" />
    <div style={{ padding: 24 }}>{ld ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading...</div> : logs.length === 0 ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>No entries yet.</div> :
      <table className="tbl" style={{ fontSize: 12 }}><thead><tr><th>Time</th><th>Table</th><th>Action</th><th>Record</th><th>By</th></tr></thead>
        <tbody>{logs.map((l: any) => <tr key={l.id}><td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{new Date(l.created_at).toLocaleString("en-IN")}</td><td>{l.table_name}</td><td><span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: l.action === "create" ? "var(--ok-soft)" : "var(--warn-soft)", color: l.action === "create" ? "var(--ok)" : "var(--warn)" }}>{l.action}</span></td><td style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>{l.record_id?.slice(0, 8)}</td><td style={{ fontSize: 11 }}>{l.changed_by?.slice(0, 8) || "system"}</td></tr>)}</tbody></table>}</div>
  </div>);
}
