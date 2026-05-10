import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty, rupeesToPaise } from "../../lib/formatting";
import { calculateShow, validateChannelSplit, type ClassEntry, type ChannelSplit } from "../../lib/calculations";
import { saveDraftOffline, savePhotoOffline, generateLocalId, isOnline, type OfflineCDR } from "../../lib/offline-queue";
import { StatusBadge, Section, SummaryRow, PhotoPlaceholder, Icon } from "../../components/ui/shared";

interface PricingClass {
  name: string;
  price: number; // rupees
  pricePaise: number;
  snoFrom: number;
  snoTo: number;
  capacity: number;
}

export default function CDREntryPage() {
  const navigate = useNavigate();
  const { showId } = useParams();
  
  // Handle "new" route - default to show 1, or parse number
  const showNumber = showId === "new" ? 1 : (parseInt(showId || "1", 10) || 1);
  const showTimings = ["11:00 AM", "02:30 PM", "06:30 PM", "10:00 PM"];
  const showDbTimings = ["11:00:00", "14:30:00", "18:30:00", "22:00:00"];
  const showTime = showTimings[(showNumber - 1) % 4] || "06:30 PM";

  const [classes, setClasses] = useState<PricingClass[]>([]);
  const [qtys, setQtys] = useState<number[]>([]);
  const [ch, setCh] = useState<ChannelSplit>({ bms: 0, district: 0, counter: 0, comp: 0 });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filmTitle, setFilmTitle] = useState("Jungle");
  const [filmDay, setFilmDay] = useState(8);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadPricing(); }, []);

  async function loadPricing() {
    try {
      const theatreId = "aaaa0000-0000-0000-0000-000000000001";
      const { data } = await supabase
        .from("theatre_pricing")
        .select("class_name, price, sno_from, sno_to, capacity, display_order")
        .eq("theatre_id", theatreId)
        .order("display_order") as any;

      if (data?.length) {
        const cls = data.map((d: any) => ({
          name: d.class_name,
          price: d.price,
          pricePaise: rupeesToPaise(d.price),
          snoFrom: d.sno_from,
          snoTo: d.sno_to,
          capacity: d.capacity,
        }));
        setClasses(cls);
        setQtys(cls.map(() => 0));
      }
    } catch {
      // Fallback sample pricing
      const fallback = [
        { name: "Premium", price: 250, pricePaise: 25000, snoFrom: 1, snoTo: 168, capacity: 168 },
        { name: "Balcony", price: 180, pricePaise: 18000, snoFrom: 169, snoTo: 310, capacity: 142 },
        { name: "1st class", price: 120, pricePaise: 12000, snoFrom: 311, snoTo: 468, capacity: 158 },
        { name: "2nd class", price: 80, pricePaise: 8000, snoFrom: 469, snoTo: 642, capacity: 174 },
      ];
      setClasses(fallback);
      setQtys(fallback.map(() => 0));
    }
  }

  // Calculation engine
  const totals = useMemo(() => {
    if (!classes.length) return { totalQty: 0, grossPaise: 0, gstPaise: 0, bmsCommissionPaise: 0, districtCommissionPaise: 0, netCollectionPaise: 0, classBreakdown: [], cgstPaise: 0, sgstPaise: 0 };
    const classEntries: ClassEntry[] = classes.map((c, i) => ({
      className: c.name,
      pricePaise: c.pricePaise,
      qty: qtys[i] || 0,
      snoFrom: c.snoFrom,
      snoTo: c.snoFrom + (qtys[i] || 0) - 1,
    }));
    return calculateShow(classEntries, ch);
  }, [classes, qtys, ch]);

  const channelValidation = useMemo(
    () => validateChannelSplit(totals.totalQty, ch),
    [totals.totalQty, ch]
  );

  const canSubmit = channelValidation.valid && totals.totalQty > 0;

  function setQty(i: number, v: string) {
    const n = parseInt(v || "0", 10) || 0;
    const next = [...qtys]; next[i] = Math.min(n, classes[i]?.capacity || 999); setQtys(next);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const localId = generateLocalId();
      const bookingId = "b0000000-0000-0000-0000-000000000001";
      const todayISO = new Date().toISOString().split("T")[0];

      const draft: OfflineCDR = {
        localId,
        bookingId,
        showDate: todayISO,
        showNumber,
        showTiming: showTime,
        filmDay,
        classEntries: classes.map((c, i) => ({
          className: c.name,
          pricePaise: c.pricePaise,
          qty: qtys[i] || 0,
          snoFrom: c.snoFrom,
          snoTo: c.snoFrom + (qtys[i] || 0) - 1,
          totalPaise: c.pricePaise * (qtys[i] || 0),
          displayOrder: i + 1,
        })),
        channel: { ...ch },
        totalQty: totals.totalQty,
        grossPaise: totals.grossPaise,
        gstPaise: totals.gstPaise,
        bmsCommissionPaise: totals.bmsCommissionPaise,
        districtCommissionPaise: totals.districtCommissionPaise,
        netCollectionPaise: totals.netCollectionPaise,
        status: "draft",
        createdAt: new Date().toISOString(),
        syncAttempts: 0,
      };

      await saveDraftOffline(draft);
      if (photo) await savePhotoOffline(localId, photo);
    } catch (err) {
      console.error("Draft save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const bookingId = "b0000000-0000-0000-0000-000000000001";
      const todayISO = new Date().toISOString().split("T")[0];

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload photo
      let photoUrl: string | null = null;
      if (photo) {
        const path = `cdr-photos/${bookingId}/${todayISO}/show_${showNumber}.jpg`;
        const { error: uploadErr } = await supabase.storage.from("cdr-photos").upload(path, photo, { upsert: true });
        if (!uploadErr) photoUrl = path;
      }

      // Insert CDR
      const { data: cdr, error } = await (supabase as any).from("cdrs").insert({
        theatre_booking_id: bookingId,
        show_date: todayISO,
        show_timing: showDbTimings[(showNumber - 1) % 4] || "18:30:00",
        show_number: showNumber,
        film_day: filmDay,
        bms_qty: ch.bms,
        district_qty: ch.district,
        counter_qty: ch.counter,
        comp_qty: ch.comp,
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
      }).select().single();

      if (error) throw error;

      // Insert class entries
      if (cdr?.id) {
        const classRows = classes.map((c, i) => ({
          cdr_id: cdr.id,
          class_name: c.name,
          price_paise: c.pricePaise,
          qty: qtys[i] || 0,
          sno_from: c.snoFrom,
          sno_to: c.snoFrom + (qtys[i] || 0) - 1,
          total_paise: c.pricePaise * (qtys[i] || 0),
          display_order: i + 1,
        }));
        await supabase.from("cdr_class_entries").insert(classRows as any);
      }

      navigate("/rep");
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Failed to submit CDR. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
        background: "var(--surface)", borderBottom: "1px solid var(--line)",
        position: "sticky", top: 0, zIndex: 5,
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/rep")} style={{ width: 30, padding: 0, justifyContent: "center" }}>
          <Icon name="arrowL" size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Show {showNumber} · {showTime}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{filmTitle} · Day {filmDay} · Screen 1</div>
        </div>
        <StatusBadge status="draft" />
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
                <div key={c.name} style={{ display: "grid", gridTemplateColumns: "1fr 56px 70px 90px", gap: 6, alignItems: "center", padding: "8px 4px", borderTop: "1px solid var(--line)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
                      Sno {c.snoFrom}–{q > 0 ? c.snoFrom + q - 1 : c.snoFrom}
                    </div>
                  </div>
                  <div className="tnum" style={{ textAlign: "right", fontSize: 13, color: "var(--ink-3)" }}>₹{c.price}</div>
                  <input className="input input-num" value={q} onChange={e => setQty(i, e.target.value)} type="number" min="0" max={c.capacity} />
                  <div className="tnum" style={{ textAlign: "right", fontWeight: 600, fontSize: 13 }}>{fmtINR(c.price * q)}</div>
                </div>
              );
            })}
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
                <input className="input input-num" value={ch[key]} type="number" min="0"
                  onChange={e => setCh({ ...ch, [key]: parseInt(e.target.value || "0", 10) || 0 })} />
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 10, padding: "8px 10px", borderRadius: 6,
            background: channelValidation.valid ? "var(--ok-soft)" : "var(--bad-soft)",
            color: channelValidation.valid ? "var(--ok)" : "var(--bad)",
            display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500,
          }}>
            <Icon name={channelValidation.valid ? "check" : "warn"} size={14} />
            <span>
              {channelValidation.valid
                ? `Matches: ${channelValidation.channelTotal} = ${totals.totalQty} tickets`
                : `Mismatch: channels ${channelValidation.channelTotal} ≠ tickets ${totals.totalQty} (Δ ${channelValidation.delta})`}
            </span>
          </div>
        </Section>

        {/* Section C: Summary */}
        <Section title="C · Summary" hint="Auto-calculated. GST inclusive of ticket price.">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            <SummaryRow label="Gross collection" value={fmtINR(totals.grossPaise / 100)} bold />
            <SummaryRow label="GST (inclusive)" value={"− " + fmtINR(totals.gstPaise / 100)} muted />
            <SummaryRow label="BMS commission (8%)" value={"− " + fmtINR(totals.bmsCommissionPaise / 100)} muted />
            <SummaryRow label="District commission (5%)" value={"− " + fmtINR(totals.districtCommissionPaise / 100)} muted />
            <div className="div-h" style={{ margin: "4px 0" }} />
            <SummaryRow label="Net collection" value={fmtINR(totals.netCollectionPaise / 100)} bold accent />
          </div>
        </Section>

        {/* Section D: Photo proof */}
        <Section title="D · Proof" hint="Mandatory. Signed paper CDR.">
          {photoPreview ? (
            <div style={{ position: "relative" }}>
              <img src={photoPreview} alt="CDR photo" style={{ width: "100%", borderRadius: 6, maxHeight: 200, objectFit: "cover" }} />
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                {photo?.name} · {photo ? Math.round(photo.size / 1024) + " KB" : ""}
              </div>
            </div>
          ) : (
            <PhotoPlaceholder label="Tap to upload CDR photo" height={92} />
          )}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} />
          <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => fileInputRef.current?.click()}>
            <Icon name="camera" size={14} /> {photoPreview ? "Replace photo" : "Upload photo"}
          </button>
        </Section>
      </div>

      {/* Submit bar */}
      <div style={{
        position: "sticky", bottom: 0, padding: 12, background: "var(--surface)",
        borderTop: "1px solid var(--line)", display: "flex", gap: 8,
      }}>
        <button className="btn btn-block" onClick={handleSaveDraft} disabled={saving}>
          Save draft
        </button>
        <button className="btn btn-primary btn-block" disabled={!canSubmit || saving} onClick={handleSubmit}>
          {saving ? "Submitting…" : "Submit CDR"} <Icon name="arrowR" size={14} />
        </button>
      </div>
    </div>
  );
}
