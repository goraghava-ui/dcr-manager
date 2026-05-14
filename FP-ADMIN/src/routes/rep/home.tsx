import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { useUserContext } from "../../hooks/useUserContext";
import { generateDailySchedule, getShowStatus, createScheduleTimer, getNextShowInfo, formatTimeRemaining } from "../../lib/scheduler";
import { LogoLockup, PosterPlaceholder, StatusBadge, Icon } from "../../components/ui/shared";

interface ShowData { id: string; showNumber: number; time: string; status: string; qty: number; gross: number; }

export default function RepHomePage() {
  const navigate = useNavigate();
  const uc = useUserContext();
  const [shows, setShows] = useState<ShowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  useEffect(() => {
    if (!uc.loading && uc.bookingId) loadShows();
    if (!uc.loading && !uc.bookingId && !uc.error) {
      setLoading(false);
      setError("No active booking found for your theatre. Contact admin.");
    }
  }, [uc.loading, uc.bookingId]);

  async function loadShows() {
    try {
      setLoading(true);
      const todayISO = today.toISOString().split("T")[0];
      const { data: cdrs, error: err } = await (supabase as any)
        .from("cdrs").select("*")
        .eq("theatre_booking_id", uc.bookingId)
        .eq("show_date", todayISO)
        .order("show_number");

      if (err) throw new Error(err.message);

      // Use scheduler for show timings (4h30m intervals)
      const schedule = generateDailySchedule();

      setShows(schedule.map((slot) => {
        const cdr = cdrs?.find((c: any) => c.show_number === slot.showNumber);
        if (cdr) {
          return {
            id: cdr.id, showNumber: slot.showNumber, time: slot.displayTime,
            status: cdr.status, qty: cdr.total_qty, gross: cdr.gross_collection_paise / 100,
          };
        }
        return {
          id: `p-${slot.showNumber}`, showNumber: slot.showNumber, time: slot.displayTime,
          status: getShowStatus(slot.status, null), qty: 0, gross: 0,
        };
      }));
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load shows");
    } finally { setLoading(false); }
  }

  // Auto-refresh when show status transitions (e.g., show ends)
  useEffect(() => {
    if (shows.length === 0) return;
    const schedule = generateDailySchedule();
    const cleanup = createScheduleTimer(schedule, loadShows);
    return cleanup;
  }, [shows.length]);

  if (uc.loading || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen msg={error} onRetry={loadShows} />;

  const submitted = shows.filter(s => s.status === "approved" || s.status === "submitted");
  const grossTotal = shows.filter(s => s.status !== "locked").reduce((a, s) => a + s.gross, 0);
  const qtyTotal = submitted.reduce((a, s) => a + s.qty, 0);
  const approvedCount = shows.filter(s => s.status === "approved").length;
  const progressPct = shows.length > 0 ? (approvedCount / shows.length) * 100 : 0;

  // Next show info
  const schedule = generateDailySchedule();
  const { nextShow, minutesUntilNext, currentShow } = getNextShowInfo(schedule);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <LogoLockup small />
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 0, justifyContent: "center" }}><Icon name="bell" size={16} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/logout")} style={{ width: 30, padding: 0, justifyContent: "center" }}><Icon name="logout" size={16} /></button>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>Today · {dateStr}</div>
        <div className="m-h1" style={{ marginTop: 4 }}>{uc.theatreName || "Theatre"}</div>
        {uc.filmTitle && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <PosterPlaceholder color="#1f3bb8" text={uc.filmTitle.toUpperCase()} sub={`Day ${uc.filmDay}`} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{uc.filmTitle} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>· Day {uc.filmDay}</span></div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Screen {uc.screenNo} · {shows.length} shows</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "0 16px" }}>
        <div className="app-card" style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><div className="m-label">Today's gross</div><div className="tnum" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{fmtINR(grossTotal)}</div></div>
          <div><div className="m-label">Tickets sold</div><div className="tnum" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{fmtQty(qtyTotal)}</div></div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="m-label" style={{ marginBottom: 4 }}>Submission progress</div>
            <div className="progress"><i style={{ width: `${progressPct}%` }} /></div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{approvedCount} of {shows.length} approved</div>
          </div>
        </div>
      </div>

      {/* Next show / current show indicator */}
      {(currentShow || nextShow) && (
        <div style={{ padding: "0 16px", marginTop: 8 }}>
          <div style={{
            padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 10,
            background: currentShow ? "var(--info-soft)" : "var(--bg-soft)",
            border: `1px solid ${currentShow ? "color-mix(in oklab, var(--info) 20%, transparent)" : "var(--line)"}`,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 100, display: "flex", alignItems: "center", justifyContent: "center",
              background: currentShow ? "var(--info)" : "var(--ink-4)", color: "#fff", fontSize: 11, fontWeight: 600,
            }}>{currentShow ? "▶" : "⏳"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: currentShow ? "var(--info)" : "var(--ink-2)" }}>
                {currentShow
                  ? `Show ${currentShow.showNumber} running now (${currentShow.displayTime})`
                  : `Next show: ${nextShow!.displayTime} (in ${formatTimeRemaining(minutesUntilNext)})`}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
                {currentShow ? "CDR entry opens when show ends" : "4h 30m interval between shows"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "18px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="m-h2">Today's shows</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{shows.length} shows</div>
      </div>
      <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {shows.map(s => {
          const tappable = s.status !== "locked";
          const isCurrent = s.status === "pending";
          return (
            <div key={s.id} className="app-card" onClick={() => tappable && navigate(`/rep/cdr/${s.showNumber}`)}
              style={{ padding: 12, display: "flex", alignItems: "center", gap: 12, opacity: s.status === "locked" ? 0.5 : 1, cursor: tappable ? "pointer" : "not-allowed",
                borderColor: isCurrent ? "var(--accent)" : "var(--line)", boxShadow: isCurrent ? "0 0 0 3px var(--accent-soft)" : "var(--shadow-sm)" }}>
              <div style={{ width: 44, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase" }}>Show</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 1 }}>{s.showNumber}</div>
              </div>
              <div style={{ width: 1, height: 30, background: "var(--line)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.time}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                  {s.status === "locked" ? "Hasn't started" : s.status === "pending" ? "Awaiting submission" : `${fmtQty(s.qty)} tix · ${fmtINR(s.gross)}`}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <StatusBadge status={s.status === "pending" ? "progress" : s.status} />
                {tappable && <Icon name="chevron" size={14} color="var(--ink-4)" />}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ position: "sticky", bottom: 0, background: "var(--surface)", borderTop: "1px solid var(--line)", display: "flex", padding: "8px 0" }}>
        {[
          { id: "home", icon: "home", label: "Home", active: true, path: "/rep" },
          { id: "new", icon: "plus", label: "New CDR", active: false, path: "/rep/cdr/1" },
          { id: "hist", icon: "clock", label: "History", active: false, path: "/rep/history" },
          { id: "me", icon: "logout", label: "Logout", active: false, path: "/logout" },
        ].map(t => (
          <div key={t.id} onClick={() => navigate(t.path)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            color: t.active ? "var(--accent)" : "var(--ink-3)", fontSize: 11, fontWeight: t.active ? 600 : 500, cursor: "pointer",
          }}><Icon name={t.icon} size={20} /><span>{t.label}</span></div>
        ))}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 12 }}>
      <div style={{ width: 24, height: 24, border: "2px solid var(--line)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Loading shows…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function ErrorScreen({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24, textAlign: "center" }}>
      <Icon name="alert" size={32} color="var(--bad)" />
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>Something went wrong</div>
      <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, maxWidth: 300 }}>{msg}</div>
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onRetry}>Try again</button>
    </div>
  );
}
