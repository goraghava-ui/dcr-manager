import type { ReactNode } from "react";

// ── Status Badge ─────────────────────────────
const STATUS_MAP: Record<string, { c: string; t: string }> = {
  pending: { c: "b-pending", t: "Pending" },
  progress: { c: "b-progress", t: "In progress" },
  draft: { c: "b-draft", t: "Draft" },
  submitted: { c: "b-submit", t: "Submitted" },
  approved: { c: "b-approved", t: "Approved" },
  rejected: { c: "b-rejected", t: "Rejected" },
  paid: { c: "b-paid", t: "Paid" },
  overdue: { c: "b-overdue", t: "Overdue" },
  locked: { c: "b-pending", t: "Locked" },
  ok: { c: "b-approved", t: "Up to date" },
  late: { c: "b-draft", t: "Late" },
  defaulter: { c: "b-rejected", t: "Defaulter" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span className={"badge " + m.c}>
      <span className="dot" />
      {m.t}
    </span>
  );
}

// ── FP Logo Mark ─────────────────────────────
export function FPMark({ size = 24, color = "var(--accent)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="20" height="18" rx="2" stroke={color} strokeWidth="1.6" />
      <rect x="2" y="3" width="3" height="18" fill={color} />
      <rect x="19" y="3" width="3" height="18" fill={color} />
      <text x="12" y="16" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="9" fill={color}>FP</text>
    </svg>
  );
}

export function LogoLockup({ small = false }: { small?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <FPMark size={small ? 20 : 24} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <div style={{ fontWeight: 700, fontSize: small ? 13 : 14, letterSpacing: "-0.01em", color: "var(--ink-1)" }}>Friday Pictures</div>
        <div style={{ fontSize: small ? 9 : 10, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginTop: 2 }}>Theatre Collection</div>
      </div>
    </div>
  );
}

// ── Poster Placeholder ─────────────────────────────
export function PosterPlaceholder({ color = "#1f3bb8", text = "JUNGLE", sub = "Day 8", w = 44, h = 56 }: {
  color?: string; text?: string; sub?: string; w?: number; h?: number;
}) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 4, flexShrink: 0,
      background: `linear-gradient(160deg, ${color}, color-mix(in oklab, ${color} 70%, black))`,
      color: "#fff", display: "flex", flexDirection: "column", justifyContent: "flex-end",
      padding: 4, boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", lineHeight: 1.1,
    }}>
      <div>{text}</div>
      <div style={{ opacity: 0.65, fontWeight: 400, letterSpacing: 0 }}>{sub}</div>
    </div>
  );
}

// ── Photo Placeholder ─────────────────────────────
export function PhotoPlaceholder({ label = "CDR photo", height = 100 }: { label?: string; height?: number }) {
  return (
    <div style={{
      height, border: "1px dashed var(--line-2)", borderRadius: 6,
      background: "repeating-linear-gradient(135deg, var(--bg) 0 6px, var(--bg-soft) 6px 12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 6, color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontSize: 11,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M9 7l1.5-2h3L15 7"/>
      </svg>
      {label}
    </div>
  );
}

// ── Metric Card ─────────────────────────────
export function Metric({ lbl, val, sub, delta }: { lbl: string; val: string; sub: string; delta?: string }) {
  return (
    <div className="metric">
      <div className="lbl">{lbl}</div>
      <div className="val">{val}</div>
      <div className="sub" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{sub}</span>
        {delta && <span className={delta.startsWith("+") ? "delta-up" : "delta-down"} style={{ fontWeight: 500 }}>{delta}</span>}
      </div>
    </div>
  );
}

// ── Section Card ─────────────────────────────
export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="app-card" style={{ padding: 14 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.02em" }}>{title}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Summary Row ─────────────────────────────
export function SummaryRow({ label, value, bold, muted, accent }: {
  label: string; value: string; bold?: boolean; muted?: boolean; accent?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ color: muted ? "var(--ink-3)" : "var(--ink-2)", fontSize: 13 }}>{label}</span>
      <span className="tnum" style={{
        fontWeight: bold ? 700 : 500,
        color: accent ? "var(--accent)" : muted ? "var(--ink-3)" : "var(--ink-1)",
        fontSize: bold ? 14 : 13,
      }}>{value}</span>
    </div>
  );
}

// ── Sparkline ─────────────────────────────
export function Spark({ data, color }: { data: number[]; color?: string }) {
  const w = 100, h = 36, max = Math.max(...data, 1);
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - (v / max) * h * 0.9 - 2}`).join(" ");
  return (
    <svg style={{ display: "block", width: "100%", height: 36 }} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color || "var(--accent)"} strokeWidth="1.4" />
      <circle cx={(data.length - 1) * step} cy={h - (data[data.length - 1] / max) * h * 0.9 - 2} r="1.7" fill={color || "var(--accent)"} />
    </svg>
  );
}

// ── Icon wrapper (Lucide-style SVG) ─────────────────────────────
interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

const ICON_PATHS: Record<string, ReactNode> = {
  home: <><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  check: <path d="M5 12l5 5L20 7"/>,
  x: <><path d="M6 6l12 12M18 6l-12 12"/></>,
  camera: <><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M9 7l1.5-2h3L15 7"/></>,
  warn: <><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.5"/></>,
  alert: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16v.5"/></>,
  chevron: <path d="M9 6l6 6-6 6"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8z"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 5-6 8-6s7 2 8 6"/></>,
  arrowR: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  arrowL: <><path d="M19 12H5M11 6l-6 6 6 6"/></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  print: <><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1"/><path d="M6 17v4h12v-4"/></>,
  download: <><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></>,
  upload: <><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  film: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 7h4M17 7h4M3 12h18M3 17h4M17 17h4"/></>,
  building: <><path d="M3 21h18"/><path d="M5 21V5h14v16"/><path d="M9 9h2M13 9h2M9 13h2M13 13h2M9 17h2M13 17h2"/></>,
  receipt: <><path d="M5 3v18l3-2 3 2 3-2 3 2 2-2V3z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  chart: <><path d="M4 20h16"/><path d="M7 17v-6M12 17V7M17 17v-9"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2L5 5.9l-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.9c.6.5 1.3.9 2 1.2L10 21h4l.5-2.6c.7-.3 1.4-.7 2-1.2l2.4.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></>,
  refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>,
  logout: <><path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4M20 12H10"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></>,
};

export function Icon({ name, size = 16, color = "currentColor", strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {ICON_PATHS[name] || null}
    </svg>
  );
}

// ── Channel Card ─────────────────────────────
export function ChannelCard({ label, qty, amt, note, date, color }: {
  label: string; qty: number; amt: number; note: string; date: string; color: string;
}) {
  return (
    <div style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 100, background: color }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{date}</span>
      </div>
      <div className="tnum" style={{ fontSize: 20, fontWeight: 600 }}>₹{Number(amt).toLocaleString("en-IN")}</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{Number(qty).toLocaleString("en-IN")} tix · {note}</div>
    </div>
  );
}
