import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fmtINR, fmtQty } from "../../lib/formatting";
import { LogoLockup, PosterPlaceholder, StatusBadge, Icon } from "../../components/ui/shared";

interface ShowData {
  id: string;
  showNumber: number;
  time: string;
  status: string;
  qty: number;
  gross: number;
}

interface BookingInfo {
  bookingId: string;
  theatreName: string;
  filmTitle: string;
  filmDay: number;
  screenNo: number;
  totalShows: number;
}

export default function RepHomePage() {
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [shows, setShows] = useState<ShowData[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const bookingId = "b0000000-0000-0000-0000-000000000001";
      const { data: bk } = await supabase.from("theatre_bookings").select("id, screen_no, theatre_id, film_id, start_date").eq("id", bookingId).single() as any;

      if (bk) {
        const { data: theatre } = await supabase.from("theatres").select("name").eq("id", bk.theatre_id).single() as any;
        const { data: film } = await supabase.from("films").select("title, release_date").eq("id", bk.film_id).single() as any;
        const filmDay = film?.release_date ? Math.ceil((today.getTime() - new Date(film.release_date).getTime()) / 86400000) + 1 : 1;

        setBooking({ bookingId: bk.id, theatreName: theatre?.name || "Theatre", filmTitle: film?.title || "Film", filmDay, screenNo: bk.screen_no, totalShows: 4 });

        const todayISO = today.toISOString().split("T")[0];
        const { data: cdrs } = await supabase.from("cdrs").select("*").eq("theatre_booking_id", bookingId).eq("show_date", todayISO).order("show_number") as any;

        const showTimings = ["11:00 AM", "02:30 PM", "06:30 PM", "10:00 PM"];
        const hours = [11, 14.5, 18.5, 22];
        const currentHour = today.getHours() + today.getMinutes() / 60;

        setShows(showTimings.map((time, i) => {
          const cdr = cdrs?.find((c: any) => c.show_number === i + 1);
          if (cdr) return { id: cdr.id, showNumber: i + 1, time, status: cdr.status, qty: cdr.total_qty, gross: cdr.gross_collection_paise / 100 };
          const ended = currentHour > hours[i] + 2.5;
          return { id: `p-${i + 1}`, showNumber: i + 1, time, status: ended ? "pending" : "locked", qty: 0, gross: 0 };
        }));
      }
    } catch {
      // Fallback sample data for demo
      setBooking({ bookingId: "demo", theatreName: "Sandhya 70mm", filmTitle: "Jungle", filmDay: 8, screenNo: 1, totalShows: 4 });
      setShows([
        { id: "s1", showNumber: 1, time: "11:00 AM", status: "approved", qty: 312, gross: 56240 },
        { id: "s2", showNumber: 2, time: "02:30 PM", status: "approved", qty: 348, gross: 63100 },
        { id: "s3", showNumber: 3, time: "06:30 PM", status: "pending", qty: 358, gross: 65620 },
        { id: "s4", showNumber: 4, time: "10:00 PM", status: "locked", qty: 0, gross: 0 },
      ]);
    } finally { setLoading(false); }
  }

  const submittedShows = shows.filter(s => s.status === "approved" || s.status === "submitted");
  const grossTotal = shows.filter(s => s.status !== "locked").reduce((a, s) => a + s.gross, 0);
  const qtyTotal = submittedShows.reduce((a, s) => a + s.qty, 0);
  const approvedCount = shows.filter(s => s.status === "approved").length;
  const pendingCount = shows.filter(s => s.status === "pending").length;
  const lockedCount = shows.filter(s => s.status === "locked").length;
  const progressPct = shows.length > 0 ? (approvedCount / shows.length) * 100 : 0;

  if (loading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><div style={{ fontSize: 13, color: "var(--ink-3)" }}>Loading…</div></div>;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <LogoLockup small />
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 0, justifyContent: "center" }}><Icon name="bell" size={16} /></button>
          <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 0, justifyContent: "center" }}><Icon name="user" size={16} /></button>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>Today · {dateStr}</div>
        <div className="m-h1" style={{ marginTop: 4 }}>{booking?.theatreName}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <PosterPlaceholder color="#1f3bb8" text={booking?.filmTitle?.toUpperCase() || "FILM"} sub={`Day ${booking?.filmDay}`} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{booking?.filmTitle} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>· Day {booking?.filmDay}</span></div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Screen {booking?.screenNo} · {booking?.totalShows} shows · Telugu</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div className="app-card" style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><div className="m-label">Today's gross</div><div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }} className="tnum">{fmtINR(grossTotal)}</div></div>
          <div><div className="m-label">Tickets sold</div><div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }} className="tnum">{fmtQty(qtyTotal)}</div></div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="m-label" style={{ marginBottom: 4 }}>Submission progress</div>
            <div className="progress"><i style={{ width: `${progressPct}%` }} /></div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
              {approvedCount} of {shows.length} approved{pendingCount > 0 && ` · ${pendingCount} pending`}{lockedCount > 0 && ` · ${lockedCount} locked`}
            </div>
          </div>
        </div>
      </div>

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
              style={{ padding: 12, display: "flex", alignItems: "center", gap: 12,
                opacity: s.status === "locked" ? 0.5 : 1, cursor: tappable ? "pointer" : "not-allowed",
                borderColor: isCurrent ? "var(--accent)" : "var(--line)",
                boxShadow: isCurrent ? "0 0 0 3px var(--accent-soft)" : "var(--shadow-sm)",
              }}>
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
          { id: "new", icon: "plus", label: "New CDR", active: false, path: "/rep/cdr/new" },
          { id: "hist", icon: "clock", label: "History", active: false, path: "/rep/history" },
          { id: "me", icon: "logout", label: "Logout", active: false, path: "/logout" },
        ].map(t => (
          <div key={t.id} onClick={() => navigate(t.path)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            color: t.active ? "var(--accent)" : "var(--ink-3)", fontSize: 11,
            fontWeight: t.active ? 600 : 500, cursor: "pointer",
          }}>
            <Icon name={t.icon} size={20} /><span>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
