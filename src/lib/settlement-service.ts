/**
 * Settlement Generation Service
 * 
 * Aggregates approved CDRs for a theatre booking over a period,
 * calculates all deductions, and generates a settlement record.
 * 
 * Called from distributor dashboard when "Generate settlement" is clicked.
 */

import { supabase } from "./supabase";
import { calculateSettlement } from "./calculations";

interface GenerateSettlementParams {
  bookingId: string;
  periodStart: string; // ISO date
  periodEnd: string;   // ISO date
  generatedBy: string; // user UUID
  publicityPaise?: number;
  previousBalancePaise?: number;
  otherDeductionsPaise?: number;
}

interface SettlementResult {
  success: boolean;
  settlementId?: string;
  settlementNo?: string;
  error?: string;
}

/**
 * Generate a settlement number: {FILM_CODE}-{THEATRE_CODE}-W{WEEK}
 */
function generateSettlementNo(filmTitle: string, theatreName: string, weekNum: number): string {
  const filmCode = filmTitle.substring(0, 3).toUpperCase();
  const theatreCode = theatreName
    .split(" ")
    .map(w => w[0])
    .join("")
    .substring(0, 3)
    .toUpperCase();
  return `${filmCode}-${theatreCode}-W${weekNum}`;
}

/**
 * Calculate week number since film release
 */
function getWeekNumber(releaseDate: string, periodEnd: string): number {
  const release = new Date(releaseDate);
  const end = new Date(periodEnd);
  const diffDays = Math.ceil((end.getTime() - release.getTime()) / (1000 * 60 * 60 * 24));
  return Math.ceil(diffDays / 7);
}

export async function generateSettlement(params: GenerateSettlementParams): Promise<SettlementResult> {
  try {
    // 1. Fetch booking details
    const { data: booking, error: bkErr } = await (supabase as any)
      .from("theatre_bookings")
      .select("*, theatre_id, film_id, distributor_share_pct, bms_commission_pct, district_commission_pct")
      .eq("id", params.bookingId)
      .single();

    if (bkErr || !booking) throw new Error("Booking not found");

    // 2. Fetch theatre name
    const { data: theatre } = await (supabase as any)
      .from("theatres")
      .select("name, total_seats")
      .eq("id", booking.theatre_id)
      .single();

    // 3. Fetch film title + release date
    const { data: film } = await (supabase as any)
      .from("films")
      .select("title, release_date")
      .eq("id", booking.film_id)
      .single();

    // 4. Fetch theatre maintenance
    const { data: pricing } = await (supabase as any)
      .from("theatre_pricing")
      .select("*")
      .eq("theatre_id", booking.theatre_id)
      .limit(1);

    const maintenancePerTicketPaise = 500; // ₹5 default

    // 5. Fetch all approved CDRs in the period
    const { data: cdrs, error: cdrErr } = await (supabase as any)
      .from("cdrs")
      .select("*")
      .eq("theatre_booking_id", params.bookingId)
      .eq("status", "approved")
      .gte("show_date", params.periodStart)
      .lte("show_date", params.periodEnd);

    if (cdrErr) throw new Error("Failed to fetch CDRs: " + cdrErr.message);

    if (!cdrs || cdrs.length === 0) {
      // Zero-collection period — still generate ₹0 settlement
    }

    // 6. Aggregate CDR totals
    const totalTickets = (cdrs || []).reduce((a: number, c: any) => a + c.total_qty, 0);
    const grossPaise = (cdrs || []).reduce((a: number, c: any) => a + c.gross_collection_paise, 0);
    const gstPaise = (cdrs || []).reduce((a: number, c: any) => a + c.gst_paise, 0);
    const bmsCommissionPaise = (cdrs || []).reduce((a: number, c: any) => a + c.bms_commission_paise, 0);
    const districtCommissionPaise = (cdrs || []).reduce((a: number, c: any) => a + c.district_commission_paise, 0);
    const compTickets = (cdrs || []).reduce((a: number, c: any) => a + (c.comp_qty || 0), 0);

    // 7. Calculate settlement using the engine
    const calc = calculateSettlement({
      totalTickets,
      grossPaise,
      gstPaise,
      bmsCommissionPaise,
      districtCommissionPaise,
      distributorSharePct: Number(booking.distributor_share_pct),
      maintenancePerTicketPaise,
      compTickets,
      publicityPaise: params.publicityPaise || 0,
      otherDeductionsPaise: params.otherDeductionsPaise || 0,
      previousBalancePaise: params.previousBalancePaise || 0,
    });

    // 8. Generate settlement number
    const weekNum = film?.release_date ? getWeekNumber(film.release_date, params.periodEnd) : 1;
    const settlementNo = generateSettlementNo(
      film?.title || "FLM",
      theatre?.name || "THR",
      weekNum
    );

    // 9. Calculate payment due date (T+3 banking days)
    const dueDate = new Date(params.periodEnd);
    let bankingDays = 0;
    while (bankingDays < 3) {
      dueDate.setDate(dueDate.getDate() + 1);
      const dow = dueDate.getDay();
      if (dow !== 0 && dow !== 6) bankingDays++;
    }

    // 10. Insert settlement
    const { data: settlement, error: insertErr } = await (supabase as any)
      .from("prd_settlements")
      .insert({
        settlement_no: settlementNo,
        theatre_booking_id: params.bookingId,
        period_start: params.periodStart,
        period_end: params.periodEnd,
        total_tickets: calc.totalTickets,
        gross_collection_paise: calc.grossPaise,
        gst_paise: calc.gstPaise,
        net_collection_paise: calc.netPaise,
        distributor_share_paise: calc.distributorSharePaise,
        maintenance_paise: calc.maintenancePaise,
        bms_commission_paise: calc.bmsCommissionPaise,
        district_commission_paise: calc.districtCommissionPaise,
        publicity_paise: calc.publicityPaise,
        other_deductions_paise: calc.otherDeductionsPaise,
        previous_balance_paise: calc.previousBalancePaise,
        net_payable_paise: calc.netPayablePaise,
        status: "draft",
        generated_by: params.generatedBy,
        payment_due_date: dueDate.toISOString().split("T")[0],
      })
      .select()
      .single();

    if (insertErr) throw new Error("Failed to insert settlement: " + insertErr.message);

    // 11. Log to audit
    await (supabase as any).from("prd_audit_logs").insert({
      table_name: "prd_settlements",
      record_id: settlement.id,
      action: "create",
      changed_by: params.generatedBy,
      after_data: { settlement_no: settlementNo, net_payable_paise: calc.netPayablePaise },
    }) as any; // eslint-disable-line

    return {
      success: true,
      settlementId: settlement.id,
      settlementNo,
    };
  } catch (err) {
    console.error("Settlement generation failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Mark settlement as sent
 */
export async function sendSettlement(settlementId: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("prd_settlements")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", settlementId);
  return !error;
}

/**
 * Acknowledge settlement (theatre manager)
 */
export async function acknowledgeSettlement(settlementId: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("prd_settlements")
    .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
    .eq("id", settlementId);
  return !error;
}

/**
 * Mark settlement as paid
 */
export async function markSettlementPaid(
  settlementId: string,
  paymentRef: string,
  paymentMode: string
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("prd_settlements")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_reference: paymentRef,
      payment_mode: paymentMode,
    })
    .eq("id", settlementId);
  return !error;
}
