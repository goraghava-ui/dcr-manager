/**
 * Test fixtures for calculation engine — PRD Section 13
 * Run: npx tsx src/lib/__tests__/calculations.test.ts
 */

import {
  calculateShow,
  validateChannelSplit,
  calculateSettlement,
  type ClassEntry,
  type ChannelSplit,
} from "../calculations";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

function assertClose(actual: number, expected: number, label: string, tolerance = 100) {
  // tolerance in paise (1 rupee = 100 paise)
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passed++;
    console.log(`  ✓ ${label} (${actual} ≈ ${expected}, Δ${diff})`);
  } else {
    failed++;
    console.error(`  ✗ ${label}: got ${actual}, expected ${expected} (Δ${diff})`);
  }
}

// ═══ Test Case 1: Standard show, mixed channels ═══
console.log("\nTest 1: Standard show, mixed channels");
{
  const classes: ClassEntry[] = [
    { className: "Premium", pricePaise: 25000, qty: 142, snoFrom: 1, snoTo: 142 },
    { className: "Balcony", pricePaise: 18000, qty: 98, snoFrom: 143, snoTo: 240 },
    { className: "1st class", pricePaise: 12000, qty: 76, snoFrom: 241, snoTo: 316 },
    { className: "2nd class", pricePaise: 8000, qty: 42, snoFrom: 317, snoTo: 358 },
  ];
  const channel: ChannelSplit = { bms: 124, district: 58, counter: 176, comp: 0 };

  const result = calculateShow(classes, channel);

  assert(result.totalQty === 358, "Total qty = 358");
  assert(result.grossPaise === 6562000, "Gross = ₹65,620 (6562000 paise)");

  // GST per class (inclusive):
  // Premium: 35500 × 18/118 = ₹5,415.25 → 541525 paise
  // Balcony: 17640 × 18/118 = ₹2,690.85 → 269085 paise
  // 1st class: 9120 × 18/118 = ₹1,390.85 → 139085 paise
  // 2nd class: 3360 × 12/112 = ₹360.00 → 36000 paise
  // Total GST ≈ ₹9,856.94 → ~985694 paise
  assertClose(result.gstPaise, 985695, "GST ≈ ₹9,857", 200);

  // Channel validation
  const cv = validateChannelSplit(result.totalQty, channel);
  assert(cv.valid, "Channel split matches (124+58+176+0 = 358)");

  // BMS commission: 124/358 * 65620 * 0.08 = ₹1,818
  assertClose(result.bmsCommissionPaise, 181846, "BMS commission ≈ ₹1,818", 200);
}

// ═══ Test Case 2: All complimentary ═══
console.log("\nTest 2: All complimentary tickets");
{
  const classes: ClassEntry[] = [
    { className: "Premium", pricePaise: 25000, qty: 0, snoFrom: 1, snoTo: 0 },
    { className: "Balcony", pricePaise: 18000, qty: 0, snoFrom: 143, snoTo: 142 },
  ];
  const channel: ChannelSplit = { bms: 0, district: 0, counter: 0, comp: 358 };

  const result = calculateShow(classes, channel);

  assert(result.totalQty === 0, "Total qty = 0 (no paid tickets)");
  assert(result.grossPaise === 0, "Gross = ₹0");
  assert(result.gstPaise === 0, "GST = ₹0");
  assert(result.bmsCommissionPaise === 0, "BMS commission = ₹0");
  assert(result.netCollectionPaise === 0, "Net = ₹0");
}

// ═══ Test Case 3: Channel mismatch (must reject) ═══
console.log("\nTest 3: Channel mismatch validation");
{
  const channel: ChannelSplit = { bms: 100, district: 100, counter: 100, comp: 0 };
  const cv = validateChannelSplit(358, channel);

  assert(!cv.valid, "Channel split INVALID (300 ≠ 358)");
  assert(cv.delta === -58, "Delta = -58");
}

// ═══ Test Case 4: Mixed GST rates ═══
console.log("\nTest 4: Mixed GST rates (some ≥₹100, some <₹100)");
{
  const classes: ClassEntry[] = [
    { className: "Premium", pricePaise: 25000, qty: 100, snoFrom: 1, snoTo: 100 },  // 18%
    { className: "2nd class", pricePaise: 8000, qty: 100, snoFrom: 101, snoTo: 200 },  // 12%
  ];
  const channel: ChannelSplit = { bms: 50, district: 50, counter: 100, comp: 0 };

  const result = calculateShow(classes, channel);

  // Premium: 25000*100 = 2500000, GST = 2500000 * 18/118 = 381356
  // 2nd class: 8000*100 = 800000, GST = 800000 * 12/112 = 85714
  // Total GST ≈ 467070
  assert(result.grossPaise === 3300000, "Gross = ₹33,000");
  assertClose(result.gstPaise, 467070, "Mixed GST ≈ ₹4,671", 200);

  // Verify each class got correct rate
  const premBd = result.classBreakdown.find(c => c.className === "Premium");
  const secBd = result.classBreakdown.find(c => c.className === "2nd class");
  assert(premBd?.gstRate === 0.18, "Premium uses 18% GST");
  assert(secBd?.gstRate === 0.12, "2nd class uses 12% GST");
}

// ═══ Test Case 5: Settlement calculation ═══
console.log("\nTest 5: Weekly settlement calculation");
{
  const sett = calculateSettlement({
    totalTickets: 10253,
    grossPaise: 180724000,  // ~₹18.07L
    gstPaise: 27567000,
    bmsCommissionPaise: 3840000,
    districtCommissionPaise: 920000,
    distributorSharePct: 50,
    maintenancePerTicketPaise: 500,  // ₹5
    compTickets: 0,
    publicityPaise: 2500000,  // ₹25,000
    previousBalancePaise: -840000,  // ₹8,400 credit from prev week
  });

  assert(sett.totalTickets === 10253, "Total tickets = 10,253");
  assert(sett.maintenancePaise === 10253 * 500, "Maintenance = 10253 × ₹5");
  assertClose(sett.distributorSharePaise, 74198500, "Distributor share (50%) ≈ ₹7.42L", 500);
  
  // Net payable = share - maintenance - publicity - other + prevBalance
  // Should be rounded to nearest rupee
  assert(sett.netPayablePaise % 100 === 0, "Final amount rounded to nearest rupee");
}

// ═══ Test Case 6: Zero collection period ═══
console.log("\nTest 6: Zero collection period");
{
  const sett = calculateSettlement({
    totalTickets: 0,
    grossPaise: 0,
    gstPaise: 0,
    bmsCommissionPaise: 0,
    districtCommissionPaise: 0,
    distributorSharePct: 50,
    maintenancePerTicketPaise: 500,
    compTickets: 0,
  });

  assert(sett.netPayablePaise === 0, "₹0 settlement for zero collection");
}

// ═══ Summary ═══
console.log(`\n${"═".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
