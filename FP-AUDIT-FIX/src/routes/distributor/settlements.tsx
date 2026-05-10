import { useNavigate } from "react-router-dom";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { StatusBadge, SummaryRow, LogoLockup, Icon } from "../../components/ui/shared";

const DAYS = [
  { d: "28 Apr", tix: 1240, gross: 218400, gst: 33304, net: 185096, share: 92548 },
  { d: "29 Apr", tix: 1380, gross: 243600, gst: 37159, net: 206441, share: 103221 },
  { d: "30 Apr", tix: 1410, gross: 248600, gst: 37919, net: 210681, share: 105341 },
  { d: "1 May",  tix: 1568, gross: 276400, gst: 42163, net: 234237, share: 117119 },
  { d: "2 May",  tix: 1620, gross: 285600, gst: 43566, net: 242034, share: 121017 },
  { d: "3 May",  tix: 1545, gross: 272240, gst: 41527, net: 230713, share: 115357 },
  { d: "4 May",  tix: 1490, gross: 262400, gst: 40027, net: 222373, share: 111187 },
];

export default function SettlementsPage() {
  const navigate = useNavigate();
  const sum = DAYS.reduce((a, d) => ({ tix: a.tix+d.tix, gross: a.gross+d.gross, gst: a.gst+d.gst, net: a.net+d.net, share: a.share+d.share }), { tix:0, gross:0, gst:0, net:0, share:0 });
  const maint = sum.tix * 5;
  const bmsCom = 38400;
  const distCom = 9200;
  const publicity = 25000;
  const prevBalance = -8400;
  const finalAmt = sum.share - maint - bmsCom - distCom - publicity + Math.abs(prevBalance);

  return (
    <div style={{ background: "var(--bg-sunk)", minHeight: "100vh", padding: 28, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ alignSelf: "flex-start", marginBottom: 12 }}>
        <button className="btn btn-sm" onClick={() => navigate("/distributor")}><Icon name="arrowL" size={13} /> Back</button>
      </div>
      <div style={{ width: "100%", maxWidth: 720, background: "#fff", boxShadow: "0 8px 30px rgba(20,20,30,0.10)", padding: "36px 40px", fontSize: 12, lineHeight: 1.5 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid var(--ink-1)", paddingBottom: 14 }}>
          <div>
            <LogoLockup />
            <div style={{ marginTop: 12, color: "var(--ink-3)", fontSize: 11, lineHeight: 1.5 }}>
              Friday Pictures Distribution Pvt. Ltd.<br />4-1-22, Film Nagar, Hyderabad 500096<br />GSTIN: 36ABCDE1234F1Z5 · PAN: ABCDE1234F
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Settlement Statement</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, marginTop: 4 }}>JNG-SDH-W2</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>Generated 5 May 2026</div>
            <div style={{ marginTop: 6 }}><StatusBadge status="submitted" /></div>
          </div>
        </div>

        {/* Parties */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 20 }}>
          <div>
            <div className="label">Beneficiary (Theatre)</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>Sandhya 70mm</div>
            <div style={{ color: "var(--ink-3)", fontSize: 11 }}>RTC X Roads, Hyderabad 500020<br />GSTIN: 36SDHYA9876B1Z2 · A/c 0XX5829 · ICIC0001234</div>
          </div>
          <div>
            <div className="label">Period</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>28 Apr – 4 May 2026 (Week 2)</div>
            <div style={{ color: "var(--ink-3)", fontSize: 11 }}>Film: Jungle (Day 1–7) · Screen 1<br />Distributor share: 50% · Payment due: 8 May</div>
          </div>
        </div>

        {/* Day-wise table */}
        <div style={{ marginTop: 22 }}>
          <div className="label" style={{ marginBottom: 6 }}>1. Day-wise collection</div>
          <table className="tbl" style={{ fontSize: 11.5 }}>
            <thead><tr><th>Date</th><th className="num">Tix</th><th className="num">Gross</th><th className="num">GST</th><th className="num">Net</th><th className="num">Share (50%)</th></tr></thead>
            <tbody>
              {DAYS.map(d => (
                <tr key={d.d}><td>{d.d}</td><td className="num">{fmtQty(d.tix)}</td><td className="num">{fmtINR(d.gross)}</td><td className="num" style={{ color: "var(--ink-3)" }}>{fmtINR(d.gst)}</td><td className="num">{fmtINR(d.net)}</td><td className="num" style={{ fontWeight: 600 }}>{fmtINR(d.share)}</td></tr>
              ))}
              <tr style={{ background: "var(--bg-soft)" }}>
                <td style={{ fontWeight: 700 }}>Week total</td><td className="num" style={{ fontWeight: 700 }}>{fmtQty(sum.tix)}</td><td className="num" style={{ fontWeight: 700 }}>{fmtINR(sum.gross)}</td><td className="num">{fmtINR(sum.gst)}</td><td className="num" style={{ fontWeight: 700 }}>{fmtINR(sum.net)}</td><td className="num" style={{ fontWeight: 700 }}>{fmtINR(sum.share)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions + Adjustments */}
        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>2. Deductions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <DocRow lbl={`Maintenance (${fmtQty(sum.tix)} × ₹5)`} val={"− " + fmtINR(maint)} />
              <DocRow lbl="BMS commission (8% of BMS)" val={"− " + fmtINR(bmsCom)} />
              <DocRow lbl="District commission (5%)" val={"− " + fmtINR(distCom)} />
              <DocRow lbl="Publicity contribution" val={"− " + fmtINR(publicity)} />
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>3. Adjustments</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <DocRow lbl="Previous week balance" val={"+ " + fmtINR(Math.abs(prevBalance))} />
              <DocRow lbl="Advance paid (28 Apr)" val="− ₹0" />
            </div>
          </div>
        </div>

        {/* Final amount */}
        <div style={{
          marginTop: 22, padding: "16px 18px", background: "var(--bg-soft)",
          borderTop: "2px solid var(--ink-1)", borderBottom: "2px solid var(--ink-1)",
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Final amount payable</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }} className="tnum">{fmtINR(finalAmt)}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "var(--ink-3)" }}>
            Payment due <b style={{ color: "var(--ink-1)" }}>8 May 2026</b><br />
            NEFT / RTGS to A/c <b style={{ color: "var(--ink-1)", fontFamily: "var(--font-mono)" }}>0XX5829</b>, ICIC0001234
          </div>
        </div>

        {/* Signature blocks */}
        <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <SignBlock title="For Friday Pictures (Distributor)" name="Raghavendra Reddy" />
          <SignBlock title="Acknowledged · Sandhya 70mm" name="Suresh K." />
        </div>

        <div style={{ marginTop: 30, paddingTop: 12, borderTop: "1px solid var(--line)", fontSize: 10, color: "var(--ink-4)", display: "flex", justifyContent: "space-between" }}>
          <span>Page 1 of 1 · Computer-generated, signature optional</span>
          <span className="mono">JNG-SDH-W2</span>
        </div>
      </div>
    </div>
  );
}

function DocRow({ lbl, val }: { lbl: string; val: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px dashed var(--line)" }}>
      <span style={{ color: "var(--ink-2)" }}>{lbl}</span>
      <span className="tnum" style={{ fontWeight: 500 }}>{val}</span>
    </div>
  );
}

function SignBlock({ title, name }: { title: string; name: string }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 28 }}>{title}</div>
      <div style={{ borderTop: "1px solid var(--ink-2)", paddingTop: 4, fontSize: 11, color: "var(--ink-2)" }}>
        <b style={{ color: "var(--ink-1)" }}>{name}</b><br />
        <span style={{ color: "var(--ink-3)" }}>Signature & date</span>
      </div>
    </div>
  );
}
