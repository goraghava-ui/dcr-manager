import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { Icon } from "../../components/ui/shared";
import { PageHeader } from "../../components/ui/page-header";

type Tab = "theatres" | "films" | "users" | "bookings" | "pricing" | "reps" | "config" | "audit";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "theatres", label: "Theatres", icon: "building" },
  { id: "films", label: "Films", icon: "film" },
  { id: "users", label: "Users", icon: "user" },
  { id: "bookings", label: "Film → Theatre", icon: "link" },
  { id: "pricing", label: "Pricing", icon: "receipt" },
  { id: "reps", label: "Rep → Theatre", icon: "user" },
  { id: "config", label: "Config", icon: "settings" },
  { id: "audit", label: "Audit Log", icon: "eye" },
];

export default function AdminDashboardPage() {
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("theatres");
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 220, background: "var(--bg-soft)", borderRight: "1px solid var(--line)", padding: "14px 10px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, overflow: "auto" }}>
        <div style={{ padding: "8px 10px", fontWeight: 700, fontSize: 14 }}>Admin Panel</div>
        <div className="hairline" />
        <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 10px 2px" }}>Master data</div>
        {TABS.slice(0, 6).map(t => (
          <div key={t.id} className={"nav-item " + (tab === t.id ? "active" : "")} onClick={() => setTab(t.id)} style={{ cursor: "pointer" }}>
            <Icon name={t.icon} size={15} /><span>{t.label}</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".06em", padding: "8px 10px 2px" }}>System</div>
        {TABS.slice(6).map(t => (
          <div key={t.id} className={"nav-item " + (tab === t.id ? "active" : "")} onClick={() => setTab(t.id)} style={{ cursor: "pointer" }}>
            <Icon name={t.icon} size={15} /><span>{t.label}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => nav("/logout")} style={{ justifyContent: "flex-start", gap: 8 }}>
          <Icon name="logout" size={14} /> Logout
        </button>
      </aside>
      <main style={{ flex: 1, overflow: "auto" }}>
        {tab === "theatres" && <TheatresTab toast={toast} />}
        {tab === "films" && <FilmsTab toast={toast} />}
        {tab === "users" && <UsersTab toast={toast} />}
        {tab === "bookings" && <BookingsTab toast={toast} />}
        {tab === "pricing" && <PricingTab toast={toast} />}
        {tab === "reps" && <RepsTab toast={toast} />}
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
  async function add() {
    if (!fm.name.trim() || !fm.city.trim()) { toast.warning("Name and City required"); return; }
    setSv(true);
    const { error } = await (supabase as any).from("theatres").insert({ name: fm.name.trim(), city: fm.city.trim(), location: fm.location.trim(), total_seats: parseInt(fm.total_seats) || 0, number_of_screens: parseInt(fm.number_of_screens) || 1 });
    setSv(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Theatre added: " + fm.name); setFm({ name: "", city: "", location: "", total_seats: "", number_of_screens: "1" }); setSf(false); load();
  }
  return (<div>
    <PageHeader title="Theatres" sub={data.length + " theatres"} actions={<button className="btn btn-primary btn-sm" onClick={() => setSf(!sf)}>+ Add Theatre</button>} />
    {sf && <div style={{ padding: "14px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 100px 80px auto", gap: 8, alignItems: "end" }}>
        <div><label className="label">Name *</label><input className="input" value={fm.name} onChange={e => setFm({ ...fm, name: e.target.value })} placeholder="Sandhya 70mm" /></div>
        <div><label className="label">City *</label><input className="input" value={fm.city} onChange={e => setFm({ ...fm, city: e.target.value })} placeholder="Hyderabad" /></div>
        <div><label className="label">Location</label><input className="input" value={fm.location} onChange={e => setFm({ ...fm, location: e.target.value })} /></div>
        <div><label className="label">Seats</label><input className="input" type="number" value={fm.total_seats} onChange={e => setFm({ ...fm, total_seats: e.target.value })} /></div>
        <div><label className="label">Screens</label><input className="input" type="number" value={fm.number_of_screens} onChange={e => setFm({ ...fm, number_of_screens: e.target.value })} /></div>
        <button className="btn btn-primary" onClick={add} disabled={sv} style={{ height: 36 }}>{sv ? "..." : "Add"}</button>
      </div>
    </div>}
    <Tbl ld={ld} cols={["Name", "City", "Location", { n: "Seats", c: "num" }, { n: "Screens", c: "num" }]}
      rows={data.map(r => [{ v: r.name, b: true }, r.city, r.location, r.total_seats, r.number_of_screens || 1])} empty="No theatres." />
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
  async function add() {
    if (!fm.title.trim()) { toast.warning("Title required"); return; }
    setSv(true);
    const { error } = await (supabase as any).from("films").insert({ title: fm.title.trim(), language: fm.language, format: fm.format, release_date: fm.release_date || null });
    setSv(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Film added: " + fm.title); setFm({ title: "", language: "Telugu", release_date: "", format: "2D" }); setSf(false); load();
  }
  return (<div>
    <PageHeader title="Films" sub={data.length + " films"} actions={<button className="btn btn-primary btn-sm" onClick={() => setSf(!sf)}>+ Add Film</button>} />
    {sf && <div style={{ padding: "14px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 120px 140px 100px auto", gap: 8, alignItems: "end" }}>
        <div><label className="label">Title *</label><input className="input" value={fm.title} onChange={e => setFm({ ...fm, title: e.target.value })} placeholder="Jungle" /></div>
        <div><label className="label">Language</label><Sel value={fm.language} onChange={v => setFm({ ...fm, language: v })} opts={["Telugu", "Hindi", "Tamil", "Kannada"]} /></div>
        <div><label className="label">Release date</label><input className="input" type="date" value={fm.release_date} onChange={e => setFm({ ...fm, release_date: e.target.value })} /></div>
        <div><label className="label">Format</label><Sel value={fm.format} onChange={v => setFm({ ...fm, format: v })} opts={["2D", "3D", "IMAX"]} /></div>
        <button className="btn btn-primary" onClick={add} disabled={sv} style={{ height: 36 }}>{sv ? "..." : "Add"}</button>
      </div>
    </div>}
    <Tbl ld={ld} cols={["Title", "Language", "Format", "Release date"]}
      rows={data.map(f => [{ v: f.title, b: true }, f.language, f.format || "2D", f.release_date ? new Date(f.release_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"])} empty="No films." />
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
  async function add() {
    if (!fm.name.trim() || !fm.phone.trim()) { toast.warning("Name and Phone required"); return; }
    setSv(true);
    const { error } = await (supabase as any).from("users").insert({ id: crypto.randomUUID(), name: fm.name.trim(), phone: fm.phone.replace(/\s/g, "").slice(-10), role: fm.role, is_active: true });
    setSv(false);
    if (error) { toast.error(error.message); return; }
    toast.success("User added: " + fm.name); setFm({ name: "", phone: "", role: "rep" }); setSf(false); load();
  }
  const rc: Record<string, string> = { representative: "var(--accent)", exhibitor: "var(--ok)", distributor: "#9b59b6", producer: "#e6a817", admin: "var(--bad)" };
  return (<div>
    <PageHeader title="Users" sub={data.length + " users"} actions={<button className="btn btn-primary btn-sm" onClick={() => setSf(!sf)}>+ Add User</button>} />
    {sf && <div style={{ padding: "14px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 150px auto", gap: 8, alignItems: "end" }}>
        <div><label className="label">Name *</label><input className="input" value={fm.name} onChange={e => setFm({ ...fm, name: e.target.value })} placeholder="Ramesh K." /></div>
        <div><label className="label">Phone *</label><input className="input" value={fm.phone} onChange={e => setFm({ ...fm, phone: e.target.value })} placeholder="9876543210" maxLength={10} /></div>
        <div><label className="label">Role</label><Sel value={fm.role} onChange={v => setFm({ ...fm, role: v })} opts={["rep", "manager", "distributor", "producer", "admin"]} /></div>
        <button className="btn btn-primary" onClick={add} disabled={sv} style={{ height: 36 }}>{sv ? "..." : "Add"}</button>
      </div>
    </div>}
    <div style={{ padding: 24 }}>{ld ? <Loader /> : <table className="tbl"><thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Active</th></tr></thead>
      <tbody>{data.map((u: any) => <tr key={u.id}><td style={{ fontWeight: 600 }}>{u.name || "-"}</td><td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{u.phone || "-"}</td><td><RoleBadge role={u.role} rc={rc} /></td><td>{u.is_active !== false ? "Active" : "Inactive"}</td></tr>)}</tbody></table>}</div>
  </div>);
}

/* ═══ NEW: Assign Film → Theatre (Theatre Booking) ═══ */
function BookingsTab({ toast }: { toast: any }) {
  const [data, setData] = useState<any[]>([]);
  const [theatres, setTheatres] = useState<any[]>([]);
  const [films, setFilms] = useState<any[]>([]);
  const [ld, setLd] = useState(true);
  const [sf, setSf] = useState(false);
  const [fm, setFm] = useState({ theatre_id: "", film_id: "", screen_no: "1", start_date: "", distributor_share_pct: "50", bms_commission_pct: "8", district_commission_pct: "5" });
  const [sv, setSv] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    setLd(true);
    const [{ data: b }, { data: t }, { data: f }] = await Promise.all([
      (supabase as any).from("theatre_bookings").select("*, theatres(name), films(title)").order("start_date", { ascending: false }),
      (supabase as any).from("theatres").select("id, name").order("name"),
      (supabase as any).from("films").select("id, title").order("title"),
    ]);
    setData(b || []); setTheatres(t || []); setFilms(f || []); setLd(false);
    if (t?.length && !fm.theatre_id) setFm(p => ({ ...p, theatre_id: t[0].id }));
    if (f?.length && !fm.film_id) setFm(p => ({ ...p, film_id: f[0].id }));
  }

  async function add() {
    if (!fm.theatre_id || !fm.film_id || !fm.start_date) { toast.warning("Theatre, Film, and Start date required"); return; }
    setSv(true);
    const { error } = await (supabase as any).from("theatre_bookings").insert({
      theatre_id: fm.theatre_id, film_id: fm.film_id, screen_no: parseInt(fm.screen_no) || 1,
      start_date: fm.start_date, is_active: true,
      distributor_share_pct: parseFloat(fm.distributor_share_pct) || 50,
      bms_commission_pct: parseFloat(fm.bms_commission_pct) || 8,
      district_commission_pct: parseFloat(fm.district_commission_pct) || 5,
    });
    setSv(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Film assigned to theatre!"); setSf(false); load();
  }

  return (<div>
    <PageHeader title="Film → Theatre assignments" sub={"Assign which film runs in which theatre"} actions={<button className="btn btn-primary btn-sm" onClick={() => setSf(!sf)}>+ Assign Film</button>} />
    {sf && <div style={{ padding: "14px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 120px", gap: 8, alignItems: "end" }}>
        <div><label className="label">Theatre *</label><Sel value={fm.theatre_id} onChange={v => setFm({ ...fm, theatre_id: v })} opts={theatres.map((t: any) => ({ v: t.id, l: t.name }))} /></div>
        <div><label className="label">Film *</label><Sel value={fm.film_id} onChange={v => setFm({ ...fm, film_id: v })} opts={films.map((f: any) => ({ v: f.id, l: f.title }))} /></div>
        <div><label className="label">Screen</label><input className="input" type="number" value={fm.screen_no} onChange={e => setFm({ ...fm, screen_no: e.target.value })} /></div>
        <div><label className="label">Start date *</label><input className="input" type="date" value={fm.start_date} onChange={e => setFm({ ...fm, start_date: e.target.value })} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end", marginTop: 8 }}>
        <div><label className="label">Dist. share %</label><input className="input" type="number" value={fm.distributor_share_pct} onChange={e => setFm({ ...fm, distributor_share_pct: e.target.value })} /></div>
        <div><label className="label">BMS comm. %</label><input className="input" type="number" value={fm.bms_commission_pct} onChange={e => setFm({ ...fm, bms_commission_pct: e.target.value })} /></div>
        <div><label className="label">District comm. %</label><input className="input" type="number" value={fm.district_commission_pct} onChange={e => setFm({ ...fm, district_commission_pct: e.target.value })} /></div>
        <button className="btn btn-primary" onClick={add} disabled={sv} style={{ height: 36 }}>{sv ? "..." : "Assign"}</button>
      </div>
    </div>}
    <Tbl ld={ld} cols={["Theatre", "Film", { n: "Screen", c: "num" }, "Start", { n: "Dist%", c: "num" }, { n: "BMS%", c: "num" }, "Active"]}
      rows={data.map((b: any) => [{ v: b.theatres?.name || "-", b: true }, b.films?.title || "-", b.screen_no, b.start_date ? new Date(b.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "-", b.distributor_share_pct + "%", b.bms_commission_pct + "%", b.is_active ? "Active" : "Ended"])} empty="No bookings. Assign a film to a theatre to start." />
  </div>);
}

/* ═══ NEW: Ticket Pricing per Theatre ═══ */
function PricingTab({ toast }: { toast: any }) {
  const [data, setData] = useState<any[]>([]);
  const [theatres, setTheatres] = useState<any[]>([]);
  const [ld, setLd] = useState(true);
  const [sf, setSf] = useState(false);
  const [fm, setFm] = useState({ theatre_id: "", class_name: "Premium", price: "", sno_from: "", sno_to: "", capacity: "", display_order: "1" });
  const [sv, setSv] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    setLd(true);
    const [{ data: p }, { data: t }] = await Promise.all([
      (supabase as any).from("theatre_pricing").select("*, theatres(name)").order("theatre_id").order("display_order"),
      (supabase as any).from("theatres").select("id, name").order("name"),
    ]);
    setData(p || []); setTheatres(t || []); setLd(false);
    if (t?.length && !fm.theatre_id) setFm(pr => ({ ...pr, theatre_id: t[0].id }));
  }

  async function add() {
    if (!fm.theatre_id || !fm.price) { toast.warning("Theatre and Price required"); return; }
    setSv(true);
    const today = new Date().toISOString().split("T")[0];
    const { error } = await (supabase as any).from("theatre_pricing").insert({
      theatre_id: fm.theatre_id, class_name: fm.class_name, price: parseFloat(fm.price) || 0,
      sno_from: parseInt(fm.sno_from) || 1, sno_to: parseInt(fm.sno_to) || 100,
      capacity: parseInt(fm.capacity) || 100, display_order: parseInt(fm.display_order) || 1,
      effective_from: today,
    });
    setSv(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pricing added: " + fm.class_name + " @ Rs." + fm.price); setSf(false); load();
  }

  return (<div>
    <PageHeader title="Ticket pricing" sub="Set class-wise ticket prices per theatre" actions={<button className="btn btn-primary btn-sm" onClick={() => setSf(!sf)}>+ Add pricing</button>} />
    {sf && <div style={{ padding: "14px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 80px 80px 80px 60px auto", gap: 8, alignItems: "end" }}>
        <div><label className="label">Theatre *</label><Sel value={fm.theatre_id} onChange={v => setFm({ ...fm, theatre_id: v })} opts={theatres.map((t: any) => ({ v: t.id, l: t.name }))} /></div>
        <div><label className="label">Class</label><Sel value={fm.class_name} onChange={v => setFm({ ...fm, class_name: v })} opts={["Premium", "Balcony", "1st class", "2nd class"]} /></div>
        <div><label className="label">Price *</label><input className="input" type="number" value={fm.price} onChange={e => setFm({ ...fm, price: e.target.value })} placeholder="250" /></div>
        <div><label className="label">Sno from</label><input className="input" type="number" value={fm.sno_from} onChange={e => setFm({ ...fm, sno_from: e.target.value })} placeholder="1" /></div>
        <div><label className="label">Sno to</label><input className="input" type="number" value={fm.sno_to} onChange={e => setFm({ ...fm, sno_to: e.target.value })} placeholder="150" /></div>
        <div><label className="label">Capacity</label><input className="input" type="number" value={fm.capacity} onChange={e => setFm({ ...fm, capacity: e.target.value })} placeholder="150" /></div>
        <div><label className="label">Order</label><input className="input" type="number" value={fm.display_order} onChange={e => setFm({ ...fm, display_order: e.target.value })} /></div>
        <button className="btn btn-primary" onClick={add} disabled={sv} style={{ height: 36 }}>{sv ? "..." : "Add"}</button>
      </div>
    </div>}
    <Tbl ld={ld} cols={["Theatre", "Class", { n: "Price", c: "num" }, { n: "Sno range", c: "num" }, { n: "Capacity", c: "num" }, { n: "Order", c: "num" }]}
      rows={data.map((p: any) => [{ v: p.theatres?.name || "-", b: true }, p.class_name, "Rs." + Number(p.price), p.sno_from + "-" + p.sno_to, p.capacity, p.display_order])} empty="No pricing set. Add ticket classes and prices for each theatre." />
  </div>);
}

/* ═══ NEW: Assign Rep → Theatre ═══ */
function RepsTab({ toast }: { toast: any }) {
  const [data, setData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [theatres, setTheatres] = useState<any[]>([]);
  const [ld, setLd] = useState(true);
  const [sf, setSf] = useState(false);
  const [fm, setFm] = useState({ user_id: "", theatre_id: "" });
  const [sv, setSv] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    setLd(true);
    const [{ data: r }, { data: u }, { data: t }] = await Promise.all([
      (supabase as any).from("theatre_reps").select("*, users(name, phone), theatres(name)").order("created_at", { ascending: false }),
      (supabase as any).from("users").select("id, name, phone, role").eq("role", "rep").order("name"),
      (supabase as any).from("theatres").select("id, name").order("name"),
    ]);
    setData(r || []); setUsers(u || []); setTheatres(t || []); setLd(false);
    if (u?.length && !fm.user_id) setFm(p => ({ ...p, user_id: u[0].id }));
    if (t?.length && !fm.theatre_id) setFm(p => ({ ...p, theatre_id: t[0].id }));
  }

  async function add() {
    if (!fm.user_id || !fm.theatre_id) { toast.warning("Select both User and Theatre"); return; }
    setSv(true);
    const { error } = await (supabase as any).from("theatre_reps").insert({ user_id: fm.user_id, theatre_id: fm.theatre_id, is_active: true });
    setSv(false);
    if (error) {
      if (error.message?.includes("duplicate") || error.message?.includes("unique")) toast.warning("This rep is already assigned to this theatre");
      else toast.error(error.message);
      return;
    }
    toast.success("Rep assigned to theatre!"); setSf(false); load();
  }

  return (<div>
    <PageHeader title="Rep → Theatre assignments" sub="Assign which rep submits CDRs for which theatre" actions={<button className="btn btn-primary btn-sm" onClick={() => setSf(!sf)}>+ Assign Rep</button>} />
    {sf && <div style={{ padding: "14px 24px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
        <div><label className="label">Rep (user) *</label><Sel value={fm.user_id} onChange={v => setFm({ ...fm, user_id: v })} opts={users.map((u: any) => ({ v: u.id, l: u.name + " (" + u.phone + ")" }))} /></div>
        <div><label className="label">Theatre *</label><Sel value={fm.theatre_id} onChange={v => setFm({ ...fm, theatre_id: v })} opts={theatres.map((t: any) => ({ v: t.id, l: t.name }))} /></div>
        <button className="btn btn-primary" onClick={add} disabled={sv} style={{ height: 36 }}>{sv ? "..." : "Assign"}</button>
      </div>
    </div>}
    <Tbl ld={ld} cols={["Rep name", "Phone", "Theatre", "Active"]}
      rows={data.map((r: any) => [{ v: r.users?.name || "-", b: true }, r.users?.phone || "-", r.theatres?.name || "-", r.is_active ? "Active" : "Inactive"])} empty="No reps assigned. Assign reps to theatres so they can submit CDRs." />
  </div>);
}

function ConfigTab({ toast }: { toast: any }) {
  const [cfg, setCfg] = useState<any>({ gst_high: 18, gst_low: 12, bms: 8, dist: 5, maint: 5, terms: 3 });
  const [sv, setSv] = useState(false);
  async function save() { setSv(true); for (const [k, v] of Object.entries(cfg)) { await (supabase as any).from("system_config").upsert({ key: k, value: JSON.stringify(v) }, { onConflict: "key" }); } setSv(false); toast.success("Config saved"); }
  const fields = [{ k: "gst_high", l: "GST (>=Rs.100)", s: "%" }, { k: "gst_low", l: "GST (<Rs.100)", s: "%" }, { k: "bms", l: "BMS commission", s: "%" }, { k: "dist", l: "District commission", s: "%" }, { k: "maint", l: "Maintenance/ticket", s: "Rs" }, { k: "terms", l: "Payment terms", s: "days" }];
  return (<div>
    <PageHeader title="System config" sub="GST, commissions, terms" actions={<button className="btn btn-primary btn-sm" onClick={save} disabled={sv}>{sv ? "Saving..." : "Save Config"}</button>} />
    <div style={{ padding: 24, maxWidth: 500 }}>{fields.map(f => <div key={f.k} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><label style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{f.l}</label><input className="input" type="number" style={{ width: 80, textAlign: "right" }} value={cfg[f.k]} onChange={e => setCfg({ ...cfg, [f.k]: parseFloat(e.target.value) || 0 })} onFocus={e => e.target.select()} /><span style={{ fontSize: 12, color: "var(--ink-3)", width: 30 }}>{f.s}</span></div>)}</div>
  </div>);
}

function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [ld, setLd] = useState(true);
  useEffect(() => { (supabase as any).from("prd_audit_logs").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }: any) => { setLogs(data || []); setLd(false); }); }, []);
  return (<div>
    <PageHeader title="Audit log" sub="All changes tracked" />
    <div style={{ padding: 24 }}>{ld ? <Loader /> : logs.length === 0 ? <Empty msg="No entries yet." /> :
      <table className="tbl" style={{ fontSize: 12 }}><thead><tr><th>Time</th><th>Table</th><th>Action</th><th>Record</th><th>By</th></tr></thead>
        <tbody>{logs.map((l: any) => <tr key={l.id}><td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{new Date(l.created_at).toLocaleString("en-IN")}</td><td>{l.table_name}</td><td><span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: l.action === "create" ? "var(--ok-soft)" : "var(--warn-soft)", color: l.action === "create" ? "var(--ok)" : "var(--warn)" }}>{l.action}</span></td><td style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>{l.record_id?.slice(0, 8)}</td><td style={{ fontSize: 11 }}>{l.changed_by?.slice(0, 8) || "system"}</td></tr>)}</tbody></table>}</div>
  </div>);
}

/* ═══ Shared components ═══ */
function Sel({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: (string | { v: string; l: string })[] }) {
  return <select className="input" value={value} onChange={e => onChange(e.target.value)} style={{ height: 36 }}>
    {opts.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>;
}
function Loader() { return <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>Loading...</div>; }
function Empty({ msg }: { msg: string }) { return <div style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>{msg}</div>; }
function RoleBadge({ role, rc }: { role: string; rc: Record<string, string> }) {
  return <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 500, background: `color-mix(in oklab, ${rc[role] || "var(--ink-3)"} 15%, transparent)`, color: rc[role] || "var(--ink-3)" }}>{role}</span>;
}
function Tbl({ ld, cols, rows, empty }: { ld: boolean; cols: (string | { n: string; c: string })[]; rows: any[][]; empty: string }) {
  if (ld) return <div style={{ padding: 24 }}><Loader /></div>;
  return <div style={{ padding: 24 }}>
    <table className="tbl"><thead><tr>{cols.map((c, i) => <th key={i} className={typeof c === "object" ? c.c : ""}>{typeof c === "object" ? c.n : c}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} className={typeof cols[j] === "object" ? (cols[j] as any).c : ""} style={cell?.b ? { fontWeight: 600 } : {}}>{cell?.v || cell || "-"}</td>)}</tr>)}
      {rows.length === 0 && <tr><td colSpan={cols.length} style={{ textAlign: "center", color: "var(--ink-3)", padding: 24 }}>{empty}</td></tr>}</tbody></table></div>;
}
