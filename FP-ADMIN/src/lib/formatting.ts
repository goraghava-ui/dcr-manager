/** Format as Indian Rupees with ₹ symbol. Always uses integer paise internally. */
export function fmtINR(
  n: number,
  opts: { withSymbol?: boolean; decimals?: number } = {}
) {
  const { withSymbol = true, decimals = 0 } = opts;
  const s = Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return withSymbol ? "₹" + s : s;
}

/** Compact INR: ₹1.23 Cr, ₹4.56 L, ₹7.8K */
export function fmtCompact(n: number) {
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr";
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L";
  if (n >= 1e3) return "₹" + (n / 1e3).toFixed(1) + "K";
  return "₹" + n;
}

/** Format quantity with Indian locale (1,23,456) */
export function fmtQty(n: number) {
  return Number(n).toLocaleString("en-IN");
}

/** Format percentage */
export function pct(n: number, d = 1) {
  return Number(n).toFixed(d) + "%";
}

/** Convert paise (BIGINT) to rupees for display */
export function paiseToRupees(paise: number) {
  return paise / 100;
}

/** Convert rupees to paise (BIGINT) for storage */
export function rupeesToPaise(rupees: number) {
  return Math.round(rupees * 100);
}

/** Format date as DD MMM YYYY (Indian standard) */
export function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format time as 12-hour with AM/PM */
export function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
