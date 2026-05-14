import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR } from "../../lib/formatting";
import { useToast } from "../../hooks/useToast";
import { StatusBadge, Icon } from "../../components/ui/shared";
import { PageHeader } from "../../components/ui/page-header";

type Tab = "theatres" | "films" | "users" | "config" | "audit";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("theatres");

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Admin Sidebar */}
      <aside style={{ width: 220, background: "var(--bg-soft)", borderRight: "1px solid var(--line)", padding: "14px 10px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        <div style={{ padding: "8px 10px", fontWeight: 700, fontSize: 14 }}>⚙️ Admin Panel</div>
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

/* ════════════════════════════════════════ THEATRES ════════════════════════════════════════ */
function TheatresTab({ toast }: { toast: any }) {
  const [theatres, setTheatres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", location: "", total_seats: "", number_of_screens: "1" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any).from("theatres").select("*").order("name");
    setTheatres(data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.city.trim()) { toast.warning("Name and City required"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("theatres").insert({
      name: form.name.trim(), city: form.city.trim(), location: form.location.trim(),
      total_seats: parseInt(form.total_seats) || 0, number_of_screens: parseInt(form.number_of_screens) || 1,
    });
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Theatre added: " + form.name);
    setForm({ name: "", city: "", location: "", total_seats: "", number_of_screens: "1" });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <PageHeader title="Theatres" sub={`${theatres.length} theatres`} actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <Icon name="plus" size={13} /> Add Theatre
        </button>
      } />

      {showForm && (
        <div style={{ padding: "16px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px 80px auto", gap: 8, alignItems: "end" }}>
            <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Sandhya 70mm" /></div>
            <div><label className="label">City *</label><input className="input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Hyderabad" /></div>
            <div><label className="label">Location</label><input className="input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="RTC X Roads" /></div>
            <div><label className="label">Seats</label><input className="input" type="number" value={form.total_seats} onChange={e => setForm({...form, total_seats: e.target.value})} placeholder="642" /></div>
            <div><label className="label">Screens</label><input className="input" type="number" value={form.number_of_screens} onChange={e => setForm({...form, number_of_screens: e.target.value})} placeholder="1" /></div>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving} style={{ height: 36 }}>{saving ? "…" : "Add"}</button>
          </div>
        </div>
      )}

      <div style={{ padding: 24 }}>
        {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading…</div> :
        <table className="tbl">
          <thead><tr><th>Name</th><th>City</th><th>Location</th><th className="num">Seats</th><th className="num">Screens</th></tr></thead>
          <tbody>
            {theatres.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.name}</td>
                <td>{t.city || "—"}</td><td>{t.location || "—"}</td>
                <td className="num">{t.total_seats || "—"}</td>
                <td className="num">{t.number_of_screens || 1}</td>
              </tr>
            ))}
            {theatres.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--ink-3)", padding: 24 }}>No theatres. Click "Add Theatre" to start.</td></tr>}
          </tbody>
        </table>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════ FILMS ════════════════════════════════════════ */
function FilmsTab({ toast }: { toast: any }) {
  const [films, setFilms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", language: "Telugu", release_date: "", format: "2D" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any).from("films").select("*").order("created_at", { ascending: false });
    setFilms(data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.title.trim()) { toast.warning("Title required"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("films").insert({
      title: form.title.trim(), language: form.language, format: form.format,
      release_date: form.release_date || null,
    });
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success("Film added: " + form.title);
    setForm({ title: "", language: "Telugu", release_date: "", format: "2D" });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <PageHeader title="Films" sub={`${films.length} films`} actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <Icon name="plus" size={13} /> Add Film
        </button>
      } />

      {showForm && (
        <div style={{ padding: "16px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 120px 140px 100px auto", gap: 8, alignItems: "end" }}>
            <div><label className="label">Title *</label><input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Jungle" /></div>
            <div><label className="label">Language</label>
              <select className="input" value={form.language} onChange={e => setForm({...form, language: e.target.value})} style={{ height: 36 }}>
                <option>Telugu</option><option>Hindi</option><option>Tamil</option><option>Kannada</option><option>Malayalam</option>
              </select></div>
            <div><label className="label">Release date</label><input className="input" type="date" value={form.release_date} onChange={e => setForm({...form, release_date: e.target.value})} /></div>
            <div><label className="label">Format</label>
              <select className="input" value={form.format} onChange={e => setForm({...form, format: e.target.value})} style={{ height: 36 }}>
                <option>2D</option><option>3D</option><option>IMAX</option>
              </select></div>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving} style={{ height: 36 }}>{saving ? "…" : "Add"}</button>
          </div>
        </div>
      )}

      <div style={{ padding: 24 }}>
        {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading…</div> :
        <table className="tbl">
          <thead><tr><th>Title</th><th>Language</th><th>Format</th><th>Release date</th></tr></thead>
          <tbody>
            {films.map(f => (
              <tr key={f.id}>
                <td style={{ fontWeight: 600 }}>{f.title}</td>
                <td>{f.language || "—"}</td><td>{f.format || "2D"}</td>
                <td>{f.release_date ? new Date(f.release_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
              </tr>
            ))}
            {films.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink-3)", padding: 24 }}>No films. Click "Add Film" to start.</td></tr>}
          </tbody>
        </table>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════ USERS ════════════════════════════════════════ */
function UsersTab({ toast }: { toast: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", role: "rep" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any).from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.phone.trim()) { toast.warning("Name and Phone required"); return; }
    if (form.phone.replace(/\s/g, "").length < 10) { toast.warning("Enter valid 10-digit phone"); return; }

    setSaving(true);
    const cleanPhone = "91" + form.phone.replace(/\s/g, "").slice(-10);
    const roleMap: Record<string, string> = { rep: "representative", manager: "exhibitor", distributor: "distributor", producer: "producer", admin: "admin" };

    // First create auth user via signUp (will send OTP)
    // For admin-created users, we insert directly into profiles
    // The auth user will be created on their first login
    const { error } = await (supabase as any).from("users").insert({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      phone: form.phone.replace(/\s/g, "").slice(-10),
      role: form.role,
      is_active: true,
    });

    setSaving(false);
    if (error) {
      if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
        toast.error("Phone number already registered");
      } else {
        toast.error("Failed: " + error.message);
      }
      return;
    }
    toast.success("User added: " + form.name + " (" + form.role + ")");
    toast.info("User will get their profile on first OTP login");
    setForm({ name: "", phone: "", role: "rep" });
    setShowForm(false);
    load();
  }

  const roleColors: Record<string, string> = {
    representative: "var(--accent)", exhibitor: "var(--ok)", distributor: "#9b59b6",
    producer: "#e6a817", admin: "var(--bad)", rep: "var(--accent)", manager: "var(--ok)",
  };

  return (
    <div>
      <PageHeader title="Users" sub={`${users.length} users`} actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <Icon name="plus" size={13} /> Add User
        </button>
      } />

      {showForm && (
        <div style={{ padding: "16px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 150px auto", gap: 8, alignItems: "end" }}>
            <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ramesh K." /></div>
            <div><label className="label">Phone * (10 digits)</label><input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="9876543210" maxLength={10} /></div>
            <div><label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={{ height: 36 }}>
                <option value="rep">Rep</option><option value="manager">Manager</option>
                <option value="distributor">Distributor</option><option value="producer">Producer</option>
                <option value="admin">Admin</option>
              </select></div>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving} style={{ height: 36 }}>{saving ? "…" : "Add"}</button>
          </div>
        </div>
      )}

      <div style={{ padding: 24 }}>
        {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading…</div> :
        <table className="tbl">
          <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Active</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name || "—"}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{u.phone || "—"}</td>
                <td><span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: `color-mix(in oklab, ${roleColors[u.role] || "var(--ink-3)"} 15%, transparent)`, color: roleColors[u.role] || "var(--ink-3)" }}>{u.role}</span></td>
                <td>{u.is_active !== false ? <span style={{ color: "var(--ok)" }}>● Active</span> : <span style={{ color: "var(--ink-4)" }}>○ Inactive</span>}</td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink-3)", padding: 24 }}>No users found.</td></tr>}
          </tbody>
        </table>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════ CONFIG ════════════════════════════════════════ */
function ConfigTab({ toast }: { toast: any }) {
  const [config, setConfig] = useState<Record<string, any>>({
    gst_rate_high: 18, gst_rate_low: 12, bms_commission: 8, district_commission: 5,
    maintenance_per_ticket: 5, settlement_period: "weekly", payment_terms_days: 3,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    for (const [key, value] of Object.entries(config)) {
      await (supabase as any).from("system_config").upsert({ key, value: JSON.stringify(value) }, { onConflict: "key" });
    }
    setSaving(false);
    toast.success("Configuration saved");
  }

  const fields = [
    { key: "gst_rate_high", label: "GST rate (≥₹100 tickets)", suffix: "%" },
    { key: "gst_rate_low", label: "GST rate (<₹100 tickets)", suffix: "%" },
    { key: "bms_commission", label: "BMS commission", suffix: "%" },
    { key: "district_commission", label: "District commission", suffix: "%" },
    { key: "maintenance_per_ticket", label: "Maintenance per ticket", suffix: "₹" },
    { key: "payment_terms_days", label: "Payment terms", suffix: "days" },
  ];

  return (
    <div>
      <PageHeader title="System Config" sub="GST rates, commissions, settlement terms" actions={
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Config"}</button>
      } />
      <div style={{ padding: 24, maxWidth: 600 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {fields.map(f => (
            <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{f.label}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input className="input" type="number" style={{ width: 80, textAlign: "right" }}
                  value={config[f.key]} onChange={e => setConfig({...config, [f.key]: parseFloat(e.target.value) || 0})}
                  onFocus={e => e.target.select()} />
                <span style={{ fontSize: 12, color: "var(--ink-3)", width: 30 }}>{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginBottom: 8 }}>Theatre Pricing Matrix</div>
          <PricingMatrix toast={toast} />
        </div>
      </div>
    </div>
  );
}

function PricingMatrix({ toast }: { toast: any }) {
  const [pricing, setPricing] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any).from("theatre_pricing").select("*, theatres(name)").order("theatre_id").order("display_order")
      .then(({ data }: any) => setPricing(data || []));
  }, []);

  return pricing.length === 0 ? (
    <div style={{ padding: 16, color: "var(--ink-3)", fontSize: 13 }}>No pricing configured.</div>
  ) : (
    <table className="tbl" style={{ fontSize: 12 }}>
      <thead><tr><th>Theatre</th><th>Class</th><th className="num">Price</th><th className="num">Sno range</th><th className="num">Capacity</th></tr></thead>
      <tbody>
        {pricing.map(p => (
          <tr key={p.id}>
            <td>{(p.theatres as any)?.name || "—"}</td>
            <td style={{ fontWeight: 600 }}>{p.class_name}</td>
            <td className="num">₹{Number(p.price)}</td>
            <td className="num" style={{ fontFamily: "var(--font-mono)" }}>{p.sno_from}–{p.sno_to}</td>
            <td className="num">{p.capacity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ════════════════════════════════════════ AUDIT ════════════════════════════════════════ */
function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase as any).from("prd_audit_logs").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }: any) => { setLogs(data || []); setLoading(false); });
  }, []);

  return (
    <div>
      <PageHeader title="Audit Log" sub="All data changes tracked" />
      <div style={{ padding: 24 }}>
        {loading ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading…</div> :
        logs.length === 0 ? <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>No audit entries yet. Actions will appear here as users submit CDRs and make changes.</div> :
        <table className="tbl" style={{ fontSize: 12 }}>
          <thead><tr><th>Timestamp</th><th>Table</th><th>Action</th><th>Record ID</th><th>Changed by</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{new Date(l.created_at).toLocaleString("en-IN")}</td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{l.table_name}</td>
                <td><span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: l.action === "create" ? "var(--ok-soft)" : l.action === "update" ? "var(--warn-soft)" : "var(--bad-soft)",
                  color: l.action === "create" ? "var(--ok)" : l.action === "update" ? "var(--warn)" : "var(--bad)",
                }}>{l.action}</span></td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>{l.record_id?.slice(0, 8)}…</td>
                <td style={{ fontSize: 11 }}>{l.changed_by?.slice(0, 8) || "system"}</td>
                <td style={{ fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{l.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
    </div>
  );
}
