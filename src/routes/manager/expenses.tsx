import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR } from "../../lib/formatting";
import { useUserContext } from "../../hooks/useUserContext";
import { useToast } from "../../hooks/useToast";
import { Icon, LogoLockup } from "../../components/ui/shared";

const CATEGORIES = ["Electricity", "Cleaning", "Staff salary", "Maintenance", "Snacks/canteen", "Other"];
const MODES = ["Cash", "UPI", "Bank", "Cheque"];

interface Expense {
  id: string;
  category: string;
  amount_paise: number;
  paid_to: string;
  payment_mode: string;
  note: string;
  expense_date: string;
}

export default function ExpensesPage() {
  const navigate = useNavigate();
  const uc = useUserContext();
  const toast = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [mode, setMode] = useState(MODES[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uc.loading && uc.theatreId) loadExpenses();
  }, [uc.loading, uc.theatreId]);

  async function loadExpenses() {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("expenses")
        .select("*")
        .eq("theatre_id", uc.theatreId)
        .order("expense_date", { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      setExpenses(data || []);
    } catch (err: any) {
      toast.error("Failed to load expenses: " + err.message);
    } finally { setLoading(false); }
  }

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.warning("Enter a valid amount"); return; }
    if (!paidTo.trim()) { toast.warning("Enter payee name"); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any).from("expenses").insert({
        theatre_id: uc.theatreId,
        category,
        amount_paise: Math.round(amt * 100),
        paid_to: paidTo.trim(),
        payment_mode: mode.toLowerCase(),
        note: note.trim(),
        expense_date: new Date().toISOString().split("T")[0],
        added_by: user.id,
      });

      if (error) throw new Error(error.message);

      toast.success(`Expense added: ₹${amt} to ${paidTo}`);
      setShowForm(false);
      setAmount(""); setPaidTo(""); setNote("");
      loadExpenses();
    } catch (err: any) {
      toast.error("Failed to add expense: " + err.message);
    } finally { setSaving(false); }
  }

  const filtered = filter === "All" ? expenses : expenses.filter(e => e.category === filter);
  const monthTotal = expenses.reduce((a, e) => a + e.amount_paise, 0);

  // Group by date
  const grouped: Record<string, Expense[]> = {};
  filtered.forEach(e => {
    const d = new Date(e.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(e);
  });

  const catTotals = CATEGORIES.map(c => ({
    name: c,
    total: expenses.filter(e => e.category === c).reduce((a, e) => a + e.amount_paise, 0),
  })).filter(c => c.total > 0);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/manager")} style={{ width: 30, padding: 0, justifyContent: "center" }}><Icon name="arrowL" size={16} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Expenses</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })} · {uc.theatreName}</div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 0, justifyContent: "center" }}><Icon name="search" size={16} /></button>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Month total */}
        <div className="app-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Month-to-date</div>
          <div className="tnum" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{fmtINR(monthTotal / 100)}</div>
          {catTotals.length > 0 && (
            <>
              <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 10, gap: 2 }}>
                {catTotals.map((c, i) => {
                  const colors = ["var(--accent)", "#1e6fbb", "var(--ok)", "#e6a817", "#9b59b6", "var(--ink-3)"];
                  return <div key={c.name} style={{ flex: c.total, background: colors[i % colors.length], borderRadius: 2 }} />;
                })}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: "var(--ink-3)", flexWrap: "wrap" }}>
                {catTotals.map(c => <span key={c.name}>{c.name} {Math.round(c.total / monthTotal * 100)}%</span>)}
              </div>
            </>
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", ...CATEGORIES].map(c => (
            <button key={c} className={`chip ${filter === c ? "chip-active" : ""}`}
              onClick={() => setFilter(c)}
              style={{
                padding: "6px 12px", borderRadius: 20, border: "1px solid var(--line)",
                background: filter === c ? "var(--accent)" : "var(--surface)",
                color: filter === c ? "#fff" : "var(--ink-2)",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}>
              {c === "Snacks/canteen" ? "Snacks" : c === "Maintenance" ? "Maint." : c}
            </button>
          ))}
        </div>

        {/* Expense list */}
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Loading expenses…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No expenses recorded yet. Tap "+ Add expense" to start.</div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <span>{date}</span>
                <span>{fmtINR(items.reduce((a, e) => a + e.amount_paise, 0) / 100)}</span>
              </div>
              {items.map(e => (
                <div key={e.id} className="app-card" style={{ padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: "var(--bg-soft)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 600, color: "var(--accent)",
                  }}>{e.category[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.category}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{e.paid_to} · {e.payment_mode?.toUpperCase()}</div>
                  </div>
                  <div className="tnum" style={{ fontSize: 14, fontWeight: 600 }}>{fmtINR(e.amount_paise / 100)}</div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Add Expense Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ background: "var(--surface)", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, padding: 20, maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Add expense</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)} style={{ width: 28, padding: 0, justifyContent: "center" }}><Icon name="x" size={16} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label">Category</label>
                <select className="input" value={category} onChange={e => setCategory(e.target.value)} style={{ width: "100%", height: 40 }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Amount (₹)</label>
                <input className="input" type="number" min="1" placeholder="0" value={amount}
                  onChange={e => setAmount(e.target.value)} style={{ width: "100%", height: 40, fontSize: 18, fontWeight: 600 }} autoFocus />
              </div>
              <div>
                <label className="label">Paid to</label>
                <input className="input" placeholder="Payee name" value={paidTo}
                  onChange={e => setPaidTo(e.target.value)} style={{ width: "100%", height: 40 }} />
              </div>
              <div>
                <label className="label">Payment mode</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {MODES.map(m => (
                    <button key={m} onClick={() => setMode(m)} style={{
                      flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid var(--line)",
                      background: mode === m ? "var(--accent)" : "var(--surface)",
                      color: mode === m ? "#fff" : "var(--ink-2)",
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                    }}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input className="input" placeholder="Add a note…" value={note}
                  onChange={e => setNote(e.target.value)} style={{ width: "100%", height: 40 }} />
              </div>
              <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={saving}
                style={{ height: 44, fontSize: 14, marginTop: 8 }}>
                {saving ? "Saving…" : "Add expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setShowForm(true)} style={{
        position: "fixed", bottom: 20, right: 20, height: 48, padding: "0 20px",
        background: "var(--accent)", color: "#fff", border: "none", borderRadius: 24,
        fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 50,
      }}>
        <span style={{ fontSize: 18 }}>+</span> Add expense
      </button>
    </div>
  );
}
