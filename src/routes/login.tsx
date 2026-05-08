import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function LogoLockup() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="18" rx="2" stroke="var(--accent)" strokeWidth="1.6" />
        <rect x="2" y="3" width="3" height="18" fill="var(--accent)" />
        <rect x="19" y="3" width="3" height="18" fill="var(--accent)" />
        <text x="12" y="16" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="9" fill="var(--accent)">FP</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em", color: "var(--ink-1)" }}>Friday Pictures</div>
        <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)", marginTop: 2 }}>Theatre Collection</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { signInWithOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendOTP = async () => {
    if (phone.replace(/\s/g, "").length !== 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await signInWithOTP(phone);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
    }
  };

  const handleOtp = async (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const n = [...otp];
    n[i] = v;
    setOtp(n);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (n.every((x) => x)) {
      setLoading(true);
      setError("");
      const { error } = await verifyOTP(phone, n.join(""));
      setLoading(false);
      if (error) {
        setError(error.message);
        setOtp(["", "", "", "", "", ""]);
        refs.current[0]?.focus();
      } else {
        navigate("/");
      }
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 380,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ marginBottom: 36 }}><LogoLockup /></div>
        <div className="m-h1" style={{ marginBottom: 6 }}>
          {step === "phone" ? "Sign in" : "Verify"}
        </div>
        <div style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 32 }}>
          {step === "phone"
            ? "We'll send a one-time code to your registered phone."
            : <>Enter the 6-digit code sent to <b style={{ color: "var(--ink-1)" }}>+91 {phone}</b>.</>}
        </div>

        {error && (
          <div style={{
            padding: "8px 12px", borderRadius: 6, marginBottom: 16,
            background: "var(--bad-soft)", color: "var(--bad)", fontSize: 13,
          }}>{error}</div>
        )}

        {step === "phone" && (
          <>
            <div className="label" style={{ marginBottom: 6 }}>Phone number</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="input input-lg" style={{
                width: 70, display: "flex", alignItems: "center",
                justifyContent: "center", color: "var(--ink-3)",
              }}>+91</div>
              <input
                className="input input-lg"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                type="tel"
                maxLength={12}
                autoFocus
              />
            </div>
            <button
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 24 }}
              onClick={handleSendOTP}
              disabled={loading}
            >
              {loading ? "Sending…" : "Send code →"}
            </button>
            <div style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", marginTop: 24 }}>
              Phone not registered? Contact your theatre admin.
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="label" style={{ marginBottom: 8 }}>One-time code</div>
            <div style={{ display: "flex", gap: 6 }}>
              {otp.map((v, i) => (
                <input
                  key={i}
                  ref={(el) => { refs.current[i] = el; }}
                  className="input input-lg"
                  maxLength={1}
                  value={v}
                  onChange={(e) => handleOtp(i, e.target.value)}
                  style={{ textAlign: "center", fontSize: 20, fontWeight: 600, height: 48 }}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <div style={{
              marginTop: 18, fontSize: 12, color: "var(--ink-3)",
              display: "flex", justifyContent: "space-between",
            }}>
              <span>{loading ? "Verifying…" : "Resend in 0:30"}</span>
              <span
                style={{ color: "var(--accent)", fontWeight: 500, cursor: "pointer" }}
                onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); setError(""); }}
              >Change number</span>
            </div>
            <div style={{
              fontSize: 11, color: "var(--ink-4)", textAlign: "center",
              marginTop: 48, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              Session valid for 30 days
            </div>
          </>
        )}
      </div>
    </div>
  );
}

