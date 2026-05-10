/**
 * GST & Settlement Calculation Engine
 * 
 * CRITICAL: All monetary values are in INTEGER PAISE (₹1 = 100 paise).
 * This avoids floating-point errors in financial calculations.
 * Only convert to ₹ for display using paiseToRupees().
 * 
 * GST Rules (Indian cinema):
 * - Tickets ≥ ₹100: 18% GST (CGST 9% + SGST 9%) — inclusive
 * - Tickets < ₹100: 12% GST (CGST 6% + SGST 6%) — inclusive
 */

export interface ClassEntry {
  className: string;
  pricePaise: number; // per ticket, in paise
  qty: number;
  snoFrom: number;
  snoTo: number;
}

export interface ChannelSplit {
  bms: number;
  district: number;
  counter: number;
  comp: number;
}

export interface ShowCalculation {
  totalQty: number;
  grossPaise: number;
  gstPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  bmsCommissionPaise: number;
  districtCommissionPaise: number;
  netCollectionPaise: number;
  classBreakdown: ClassBreakdown[];
}

export interface ClassBreakdown {
  className: string;
  pricePaise: number;
  qty: number;
  totalPaise: number;
  gstRate: number;
  gstPaise: number;
  taxablePaise: number;
}

export interface SettlementCalculation {
  totalTickets: number;
  grossPaise: number;
  gstPaise: number;
  netPaise: number;
  distributorSharePaise: number;
  maintenancePaise: number;
  bmsCommissionPaise: number;
  districtCommissionPaise: number;
  publicityPaise: number;
  otherDeductionsPaise: number;
  previousBalancePaise: number;
  netPayablePaise: number;
}

/** Get GST rate based on ticket price */
function getGSTRate(pricePaise: number): number {
  return pricePaise >= 10000 ? 0.18 : 0.12; // ₹100 = 10000 paise
}

/** Calculate GST for a single class (inclusive GST) */
function calcClassGST(pricePaise: number, qty: number): ClassBreakdown {
  const totalPaise = pricePaise * qty;
  const rate = getGSTRate(pricePaise);
  
  // For inclusive GST: taxable = gross / (1 + rate)
  // Using integer math with banker's rounding
  const taxablePaise = Math.round(totalPaise / (1 + rate));
  const gstPaise = totalPaise - taxablePaise;

  return {
    className: "",
    pricePaise,
    qty,
    totalPaise,
    gstRate: rate,
    gstPaise,
    taxablePaise,
  };
}

/** Calculate show-level totals from class entries and channel split */
export function calculateShow(
  classes: ClassEntry[],
  channel: ChannelSplit,
  bmsCommissionRate = 0.08,
  districtCommissionRate = 0.05
): ShowCalculation {
  const breakdown: ClassBreakdown[] = classes.map((c) => {
    const result = calcClassGST(c.pricePaise, c.qty);
    return { ...result, className: c.className };
  });

  const totalQty = breakdown.reduce((a, b) => a + b.qty, 0);
  const grossPaise = breakdown.reduce((a, b) => a + b.totalPaise, 0);
  const gstPaise = breakdown.reduce((a, b) => a + b.gstPaise, 0);
  const cgstPaise = Math.round(gstPaise / 2);
  const sgstPaise = gstPaise - cgstPaise; // ensure exact split

  // BMS commission: proportional share of gross
  const bmsRatio = totalQty > 0 ? channel.bms / totalQty : 0;
  const bmsRevenuePaise = Math.round(grossPaise * bmsRatio);
  const bmsCommissionPaise = Math.round(bmsRevenuePaise * bmsCommissionRate);

  // District commission: proportional share of gross
  const districtRatio = totalQty > 0 ? channel.district / totalQty : 0;
  const districtRevenuePaise = Math.round(grossPaise * districtRatio);
  const districtCommissionPaise = Math.round(
    districtRevenuePaise * districtCommissionRate
  );

  const netCollectionPaise =
    grossPaise - gstPaise - bmsCommissionPaise - districtCommissionPaise;

  return {
    totalQty,
    grossPaise,
    gstPaise,
    cgstPaise,
    sgstPaise,
    bmsCommissionPaise,
    districtCommissionPaise,
    netCollectionPaise,
    classBreakdown: breakdown,
  };
}

/** Validate channel split matches total tickets */
export function validateChannelSplit(
  totalQty: number,
  channel: ChannelSplit
): { valid: boolean; channelTotal: number; delta: number } {
  const channelTotal = channel.bms + channel.district + channel.counter + channel.comp;
  return {
    valid: channelTotal === totalQty,
    channelTotal,
    delta: channelTotal - totalQty,
  };
}

/** Calculate settlement for a period */
export function calculateSettlement(params: {
  totalTickets: number;
  grossPaise: number;
  gstPaise: number;
  bmsCommissionPaise: number;
  districtCommissionPaise: number;
  distributorSharePct: number;
  maintenancePerTicketPaise: number;
  compTickets: number;
  publicityPaise?: number;
  otherDeductionsPaise?: number;
  previousBalancePaise?: number;
}): SettlementCalculation {
  const netPaise =
    params.grossPaise -
    params.gstPaise -
    params.bmsCommissionPaise -
    params.districtCommissionPaise;

  const distributorSharePaise = Math.round(
    netPaise * (params.distributorSharePct / 100)
  );

  // Maintenance: per paid ticket (excl comp)
  const paidTickets = params.totalTickets - params.compTickets;
  const maintenancePaise = paidTickets * params.maintenancePerTicketPaise;

  const publicityPaise = params.publicityPaise || 0;
  const otherDeductionsPaise = params.otherDeductionsPaise || 0;
  const previousBalancePaise = params.previousBalancePaise || 0;

  // Distributor net = share - maintenance - publicity - other + prev balance
  const netPayablePaise =
    distributorSharePaise -
    maintenancePaise -
    publicityPaise -
    otherDeductionsPaise +
    previousBalancePaise;

  // Round final to nearest rupee (100 paise)
  const roundedPayable = Math.round(netPayablePaise / 100) * 100;

  return {
    totalTickets: params.totalTickets,
    grossPaise: params.grossPaise,
    gstPaise: params.gstPaise,
    netPaise,
    distributorSharePaise,
    maintenancePaise,
    bmsCommissionPaise: params.bmsCommissionPaise,
    districtCommissionPaise: params.districtCommissionPaise,
    publicityPaise,
    otherDeductionsPaise,
    previousBalancePaise,
    netPayablePaise: roundedPayable,
  };
}

/** Occupancy percentage */
export function calcOccupancy(paidQty: number, totalCapacity: number): number {
  return totalCapacity > 0 ? (paidQty / totalCapacity) * 100 : 0;
}
