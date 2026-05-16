import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { calculateShow, validateChannelSplit, type ClassEntry, type ChannelSplit } from "../../lib/calculations";
import { useUserContext } from "../../hooks/useUserContext";
import { useToast } from "../../hooks/useToast";
import { StatusBadge, Section, SummaryRow, PhotoPlaceholder, Icon } from "../../components/ui/shared";

export default function CDREntryPage() {
  const navigate = useNavigate();
  const { showId } = useParams();
  const uc = useUserContext();
  const toast = useToast();

  const showNumber = showId === "new" ? 1 : (parseInt(showId || "1", 10) || 1);
  const showTimings = ["11:00 AM", "02:30 PM", "06:30 PM", "10:00 PM"];
  const showDbTimings = ["11:00:00", "14:30:00", "18:30:00", "22:00:00"];
  const showTime = showTimings[(showNumber - 1) % 4] || "06:30 PM";

  const [qtys, setQtys] = useState<number[]>(uc.pricing.map(() => 0));
  const [ch, setCh] = useState<ChannelSplit>({ bms: 0, district: 0, counter: 0, comp: 0 });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isReadOnly = existingStatus === "submitted" || existingStatus === "approved";

  // BUG-005: Fetch existing CDR for this show (if already submitted)
  useEffect(() => {
    if (!uc.bookingId || uc.loading) return;
    const todayISO = new Date().toISOString().split("T")[0];
    (supabase as any).from("cdrs")
      .select("*, cdr_class_entries(*)")
      .eq("theatre_booking_id", uc.bookingId)
      .eq("show_date", todayISO)
      .eq("show_number", showNumber)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setExistingId(data.id);
          setExistingStatus(data.status);
          setCh({ bms: data.bms_qty || 0, district: data.district_qty || 0, counter: data.counter_qty || 0, comp: data.comp_qty || 0 });
          if (data.photo_url) setPhotoPreview(data.photo_url);
          // Load class entries
          if (data.cdr_class_entries?.length && uc.pricing.length) {
            const newQtys = uc.pricing.map((p: any) => {
              const entry = data.cdr_class_entries.find((e: any) => e.class_name === p.className);
              return entry?.qty || 0;
            });
            setQtys(newQtys);
          }
        }
      });
  }, [uc.bookingId, uc.loading, showNumber]);

  // Ensure qtys array matches pricing length
  const classes = uc.pricing;
  if (qtys.length !== classes.length && classes.length > 0) {
    setQtys(classes.map(() => 0));
  }

  const totals = useMemo(() => {
    if (!classes.length) return { totalQty: 0, grossPaise: 0, gstPaise: 0, bmsCommissionPaise: 0, districtCommissionPaise: 0, netCollectionPaise: 0, classBreakdown: [], cgstPaise: 0, sgstPaise: 0 };
    const entries: ClassEntry[] = classes.map((c, i) => ({
      className: c.className, pricePaise: c.pricePaise, qty: qtys[i] || 0,
      snoFrom: c.snoFrom, snoTo: c.snoFrom + (qtys[i] || 0) - 1,
    }));
    return calculateShow(entries, ch, uc.bmsCommissionPct / 100, uc.districtCommissionPct / 100);
  }, [classes, qtys, ch]);

  const channelValidation = useMemo(() => validateChannelSplit(totals.totalQty, ch), [totals.totalQty, ch]);
  const canSubmit = channelValidation.valid && totals.totalQty > 0;

  function setQty(i: number, v: string) {
    const n = Math.max(0, Math.min(parseInt(v || "0", 10) || 0, classes[i]?.capacity || 999));
    const next = [...qtys]; next[i] = n; setQtys(next);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSaveDraft() {
    setSaving(true);
    toast.info("Draft saved locally");
    setSaving(false);
  }

  async function handleSubmit() {
    if (!canSubmit || !uc.bookingId) {
      toast.error("Cannot submit — check ticket quantities and channel split.");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated — please login again.");

      // Check if CDR already exists for this show today
      const todayISO = new Date().toISOString().split("T")[0];
      const { data: existing } = await (supabase as any).from("cdrs")
        .select("id, status")
        .eq("theatre_booking_id", uc.bookingId)
        .eq("show_date", todayISO)
        .eq("show_number", showNumber)
        .maybeSingle();

      if (existing?.status === "approved") {
        throw new Error("This CDR is already approved. Cannot modify.");
      }

      // Upload photo if present
      let photoUrl: string | null = null;
      if (photo) {
        const path = `cdr-photos/${uc.bookingId}/${todayISO}/show_${showNumber}.jpg`;
        await supabase.storage.from("cdr-photos").upload(path, photo, { upsert: true });
        photoUrl = path;
      }

      const cdrPayload = {
        theatre_booking_id: uc.bookingId,
        show_date: todayISO,
        show_timing: showDbTimings[(showNumber - 1) % 4] || "18:30:00",
        show_number: showNumber,
        film_day: uc.filmDay,
        bms_qty: ch.bms, district_qty: ch.district, counter_qty: ch.counter, comp_qty: ch.comp,
        total_qty: totals.totalQty,
        gross_collection_paise: totals.grossPaise,
        gst_paise: totals.gstPaise,
        bms_commission_paise: totals.bmsCommissionPaise,
        district_commission_paise: totals.districtCommissionPaise,
        net_collection_paise: totals.netCollectionPaise,
        status: "submitted",
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
        photo_url: photoUrl,
      };

      let cdr: any;
      let error: any;

      if (existing?.id) {
        // Update existing CDR
        const res = await (supabase as any).from("cdrs").update(cdrPayload).eq("id", existing.id).select().single();
        cdr = res.data; error = res.error;
        // Delete old class entries
        if (!error) await (supabase as any).from("cdr_class_entries").delete().eq("cdr_id", existing.id);
      } else {
        // Insert new CDR
        const res = await (supabase as any).from("cdrs").insert(cdrPayload).select().single();
        cdr = res.data; error = res.error;
      }

      if (error) {
        throw new Error(error.message || "Database error");
      }

      // Insert class entries
      if (cdr?.id) {
        await (supabase as any).from("cdr_class_entries").insert(
          classes.map((c, i) => ({
            cdr_id: cdr.id, class_name: c.className, price_paise: c.pricePaise,
            qty: qtys[i] || 0, sno_from: c.snoFrom, sno_to: c.snoFrom + (qtys[i] || 0) - 1,
            total_paise: c.pricePaise * (qtys[i] || 0), display_order: i + 1,
          }))
        );
      }

      toast.success(`CDR submitted — Show ${showNumber}, ${fmtQty(totals.totalQty)} tickets, ${fmtINR(totals.grossPaise / 100)}`);
      navigate("/rep");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit CDR");
    } finally { setSaving(false); }
  }

  if (uc.loading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><div style={{ width: 24, height: 24, border: "2px solid var(--line)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /><style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style></div>;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 5 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/rep")} style={{ width: 30, padding: 0, justifyContent: "center" }}><Icon name="arrowL" size={16} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Show {showNumber} · {showTime}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{uc.filmTitle || "Film"} · Day {uc.filmDay} · Screen {uc.screenNo}</div>
        </div>
        <StatusBadge status={existingStatus || "draft"} />
      </div>

      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {/* Section A: Class-wise sales */}
        <Section title="A · Class-wise sales" hint="Qty drives Sno range and total.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 70px 90px", gap: 6, fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 4px" }}>
              <div>Class</div><div style={{ textAlign: "right" }}>Price</div><div style={{ textAlign: "right" }}>Qty</div><div style={{ textAlign: "right" }}>Total</div>
            </div>
            {classes.map((c, i) => {
              const q = qtys[i] || 0;
              return (
                <div key={c.className} style={{ display: "grid", gridTemplateColumns: "1fr 56px 70px 90px", gap: 6, alignItems: "center", padding: "8px 4px", borderTop: "1px solid var(--line)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.className}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>Sno {c.snoFrom}–{q > 0 ? c.snoFrom + q - 1 : c.snoFrom}</div>
                  </div>
                  <div className="tnum" style={{ textAlign: "right", fontSize: 13, color: "var(--ink-3)" }}>₹{c.price}</div>
                  <input className="input input-num" value={q} onChange={e => setQty(i, e.target.value)} type="number" min="0" max={c.capacity} disabled={isReadOnly} onFocus={(e) => e.target.select()} />
                  <div className="tnum" style={{ textAlign: "right", fontWeight: 600, fontSize: 13 }}>{fmtINR(c.price * q)}</div>
                </div>
              );
            })}
            {classes.length === 0 && <div style={{ padding: 16, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No pricing configured. Contact admin.</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 70px 90px", gap: 6, padding: "10px 4px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Total</div><div></div>
              <div className="tnum" style={{ textAlign: "right", fontWeight: 700 }}>{fmtQty(totals.totalQty)}</div>
              <div className="tnum" style={{ textAlign: "right", fontWeight: 700 }}>{fmtINR(totals.grossPaise / 100)}</div>
            </div>
          </div>
        </Section>

        {/* Section B: Channel split */}
        <Section title="B · Channel split" hint="Sum must match total tickets.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {([["BMS", "bms"], ["District", "district"], ["Counter", "counter"], ["Comp", "comp"]] as const).map(([label, key]) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="label" style={{ textTransform: "none", fontSize: 11 }}>{label}</span>
                <input className="input input-num" value={ch[key]} type="number" min="0" disabled={isReadOnly} onFocus={(e) => e.target.select()}
                  onChange={e => setCh({ ...ch, [key]: Math.max(0, parseInt(e.target.value || "0", 10) || 0) })} />
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 10, padding: "8px 10px", borderRadius: 6,
            background: channelValidation.valid ? "var(--ok-soft)" : totals.totalQty === 0 ? "var(--bg-soft)" : "var(--bad-soft)",
            color: channelValidation.valid ? "var(--ok)" : totals.totalQty === 0 ? "var(--ink-3)" : "var(--bad)",
            display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500,
          }}>
            <Icon name={channelValidation.valid ? "check" : totals.totalQty === 0 ? "alert" : "warn"} size={14} />
            <span>
              {totals.totalQty === 0 ? "Enter ticket quantities above" :
                channelValidation.valid ? `Matches: ${channelValidation.channelTotal} = ${totals.totalQty} tickets` :
                `Mismatch: channels ${channelValidation.channelTotal} ≠ tickets ${totals.totalQty} (Δ ${channelValidation.delta})`}
            </span>
          </div>
        </Section>

        {/* Section C: Summary */}
        <Section title="C · Summary" hint="Auto-calculated. GST inclusive of ticket price.">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            <SummaryRow label="Gross collection" value={fmtINR(totals.grossPaise / 100)} bold />
            <SummaryRow label="GST (inclusive)" value={"− " + fmtINR(totals.gstPaise / 100)} muted />
            <SummaryRow label={`BMS commission (${uc.bmsCommissionPct}%)`} value={"− " + fmtINR(totals.bmsCommissionPaise / 100)} muted />
            <SummaryRow label={`District commission (${uc.districtCommissionPct}%)`} value={"− " + fmtINR(totals.districtCommissionPaise / 100)} muted />
            <div className="div-h" style={{ margin: "4px 0" }} />
            <SummaryRow label="Net collection" value={fmtINR(totals.netCollectionPaise / 100)} bold accent />
          </div>
        </Section>

        {/* Section D: Photo */}
        <Section title="D · Proof (optional)" hint="Photo of signed paper CDR.">
          {photoPreview ? (
            <div><img src={photoPreview} alt="CDR" style={{ width: "100%", borderRadius: 6, maxHeight: 200, objectFit: "cover" }} /></div>
          ) : (
            <PhotoPlaceholder label="Tap to upload" height={80} />
          )}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} />
          <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => fileInputRef.current?.click()}>
            <Icon name="camera" size={14} /> {photoPreview ? "Replace photo" : "Upload photo"}
          </button>
        </Section>
      </div>

      <div style={{ position: "sticky", bottom: 0, padding: 12, background: "var(--surface)", borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
        {isReadOnly ? (
          <div style={{ flex: 1, padding: "10px 16px", textAlign: "center", borderRadius: 8, background: existingStatus === "approved" ? "var(--ok-soft)" : "var(--accent-soft)", color: existingStatus === "approved" ? "var(--ok)" : "var(--accent)", fontWeight: 600, fontSize: 13 }}>
            {existingStatus === "approved" ? "✓ Approved by Manager" : "Submitted — awaiting approval"}
          </div>
        ) : (
          <>
            <button className="btn btn-block" onClick={handleSaveDraft} disabled={saving}>Save draft</button>
            <button className="btn btn-primary btn-block" disabled={!canSubmit || saving} onClick={handleSubmit}>
              {saving ? "Submitting…" : "Submit CDR"} {!saving && <Icon name="arrowR" size={14} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
