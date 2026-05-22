/**
 * useUserContext — fetches and caches the logged-in user's theatre, booking, film data.
 * 
 * This replaces ALL hardcoded booking/theatre IDs throughout the app.
 * Based on the user's auth.uid(), it fetches:
 *   - For reps: theatre_reps → theatre → theatre_bookings → film
 *   - For managers: profiles.theatre_id → theatre → theatre_bookings → film
 *   - For distributors: distributors → theatre_bookings → theatres
 */

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface UserContext {
  // Current user
  userId: string;
  userName: string;
  userRole: string;
  userPhone: string;

  // Theatre (for rep/manager)
  theatreId: string | null;
  theatreName: string | null;
  theatreCapacity: number;

  // Current active booking
  bookingId: string | null;
  filmTitle: string | null;
  filmDay: number;
  screenNo: number;
  distributorSharePct: number;
  bmsCommissionPct: number;
  districtCommissionPct: number;

  // Show schedule
  firstShowTime: string;
  numShows: number;
  showGapMinutes: number;

  // Assigned theatres (for rep theatre picker)
  assignedTheatres: Array<{ id: string; name: string; hasBooking: boolean }>;
  switchTheatre: (theatreId: string) => void;

  // Pricing
  pricing: Array<{
    className: string;
    price: number;
    pricePaise: number;
    snoFrom: number;
    snoTo: number;
    capacity: number;
  }>;

  // State
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const EMPTY: UserContext = {
  userId: "", userName: "", userRole: "", userPhone: "",
  theatreId: null, theatreName: null, theatreCapacity: 0,
  bookingId: null, filmTitle: null, filmDay: 0, screenNo: 1,
  distributorSharePct: 50, bmsCommissionPct: 8, districtCommissionPct: 5,
  firstShowTime: "11:00", numShows: 4, showGapMinutes: 270,
  assignedTheatres: [], switchTheatre: () => {},
  pricing: [], loading: true, error: null, refetch: () => {},
};

export function useUserContext(): UserContext {
  const { user, role, profile } = useAuth();
  const [ctx, setCtx] = useState<UserContext>(EMPTY);

  async function fetchContext() {
    if (!user?.id) return;
    const uid = user.id;
    if (!uid || uid === "null" || uid === "undefined") return;

    setCtx((p) => ({ ...p, loading: true, error: null }));

    try {
      const uid = user.id;
      let theatreId: string | null = null;
      let theatreName = "";
      let theatreCapacity = 0;

      // Admin, distributor, producer don't need theatre/booking context
      if (role === "admin" || role === "distributor" || role === "producer") {
        setCtx({
          userId: uid,
          userName: profile?.name || "User",
          userRole: role || "admin",
          userPhone: profile?.phone || "",
          theatreId: null, theatreName: "All Theatres", theatreCapacity: 0,
          bookingId: null, filmTitle: null, filmDay: 0, screenNo: 1,
          distributorSharePct: 50, bmsCommissionPct: 8, districtCommissionPct: 5,
          firstShowTime: "11:00", numShows: 4, showGapMinutes: 270,
          assignedTheatres: [], switchTheatre: () => {},
          pricing: [],
          loading: false, error: null,
          refetch: fetchContext,
        });
        return;
      }

      // 1. Find user's theatre (only for rep/manager)
      let assignedTheatres: UserContext["assignedTheatres"] = [];
      
      if (role === "rep") {
        // Get all theatres assigned to this rep with names
        const { data: reps } = await (supabase as any)
          .from("theatre_reps")
          .select("theatre_id, theatres(name)")
          .eq("user_id", uid)
          .eq("is_active", true);
        
        if (reps?.length) {
          const today = new Date().toISOString().split("T")[0];
          
          // Build assigned theatres list with booking status
          for (const r of reps) {
            const { data: bk } = await (supabase as any)
              .from("theatre_bookings").select("id")
              .eq("theatre_id", r.theatre_id).eq("is_active", true)
              .lte("start_date", today).limit(1);
            const hasBooking = (bk?.length || 0) > 0;
            assignedTheatres.push({ id: r.theatre_id, name: r.theatres?.name || "Theatre", hasBooking });
            if (hasBooking && !theatreId) theatreId = r.theatre_id;
          }
          
          // Fallback to first theatre if none have bookings
          if (!theatreId) theatreId = reps[0].theatre_id;
        }
      } else if (role === "manager" || role === "exhibitor") {
        const { data: prof } = await (supabase as any)
          .from("profiles")
          .select("theatre_id")
          .eq("id", uid)
          .single();
        theatreId = prof?.theatre_id || null;
      }

      // 2. Fetch theatre details
      if (theatreId && theatreId !== "null") {
        const { data: theatre } = await (supabase as any)
          .from("theatres")
          .select("name, total_seats")
          .eq("id", theatreId)
          .maybeSingle();
        theatreName = theatre?.name || "";
        theatreCapacity = theatre?.total_seats || 0;
      }

      // 3. Find active booking for this theatre
      let bookingId: string | null = null;
      let filmTitle = "";
      let filmDay = 0;
      let screenNo = 1;
      let distributorSharePct = 50;
      let bmsCommissionPct = 8;
      let districtCommissionPct = 5;
      let firstShowTime = "11:00";
      let numShows = 4;
      let showGapMinutes = 270;

      if (theatreId && theatreId !== "null") {
        const today = new Date().toISOString().split("T")[0];
        const { data: bookings, error: bkErr } = await (supabase as any)
          .from("theatre_bookings")
          .select("id, film_id, screen_no, start_date, distributor_share_pct, bms_commission_pct, district_commission_pct, first_show_time, num_shows, show_gap_minutes")
          .eq("theatre_id", theatreId)
          .eq("is_active", true)
          .lte("start_date", today)
          .order("start_date", { ascending: false })
          .limit(1);
        
        const booking = bookings?.[0] || null;

        if (booking) {
          bookingId = booking.id;
          screenNo = booking.screen_no || 1;
          distributorSharePct = Number(booking.distributor_share_pct) || 50;
          bmsCommissionPct = Number(booking.bms_commission_pct) || 8;
          districtCommissionPct = Number(booking.district_commission_pct) || 5;
          if (booking.first_show_time) firstShowTime = String(booking.first_show_time).slice(0, 5);
          if (booking.num_shows) numShows = booking.num_shows;
          if (booking.show_gap_minutes) showGapMinutes = booking.show_gap_minutes;

          // Fetch film
          const { data: film } = await (supabase as any)
            .from("films")
            .select("title, release_date")
            .eq("id", booking.film_id)
            .maybeSingle();

          if (film) {
            filmTitle = film.title || "";
            const releaseDate = new Date(film.release_date);
            filmDay = Math.max(1, Math.ceil((Date.now() - releaseDate.getTime()) / 86400000) + 1);
          }
        }
      }

      // 4. Fetch pricing for this theatre
      let pricing: UserContext["pricing"] = [];
      if (theatreId && theatreId !== "null") {
        const { data: prices } = await (supabase as any)
          .from("theatre_pricing")
          .select("class_name, price, sno_from, sno_to, capacity, display_order")
          .eq("theatre_id", theatreId)
          .order("display_order");

        if (prices?.length) {
          pricing = prices.map((p: any) => ({
            className: p.class_name,
            price: Number(p.price),
            pricePaise: Math.round(Number(p.price) * 100),
            snoFrom: p.sno_from,
            snoTo: p.sno_to,
            capacity: p.capacity,
          }));
        }
      }

      setCtx({
        userId: uid,
        userName: profile?.name || "User",
        userRole: role || "rep",
        userPhone: profile?.phone || "",
        theatreId, theatreName, theatreCapacity,
        bookingId, filmTitle, filmDay, screenNo,
        distributorSharePct, bmsCommissionPct, districtCommissionPct,
        firstShowTime, numShows, showGapMinutes,
        assignedTheatres,
        switchTheatre: (newTheatreId: string) => {
          // Force refetch with specific theatre
          setCtx(p => ({ ...p, loading: true }));
          (async () => {
            // Manually set theatreId and re-run fetch
            const today = new Date().toISOString().split("T")[0];
            const { data: theatre } = await (supabase as any).from("theatres").select("name, total_seats").eq("id", newTheatreId).single();
            const { data: booking } = await (supabase as any).from("theatre_bookings")
              .select("id, film_id, screen_no, start_date, distributor_share_pct, bms_commission_pct, district_commission_pct, first_show_time, num_shows, show_gap_minutes")
              .eq("theatre_id", newTheatreId).eq("is_active", true).lte("start_date", today).order("start_date", { ascending: false }).limit(1).single();
            let newFilmTitle = ""; let newFilmDay = 0;
            if (booking?.film_id) {
              const { data: film } = await (supabase as any).from("films").select("title, release_date").eq("id", booking.film_id).single();
              if (film) { newFilmTitle = film.title; newFilmDay = Math.max(1, Math.ceil((Date.now() - new Date(film.release_date).getTime()) / 86400000) + 1); }
            }
            const { data: prices } = await (supabase as any).from("theatre_pricing").select("class_name, price, sno_from, sno_to, capacity, display_order").eq("theatre_id", newTheatreId).order("display_order");
            setCtx(p => ({
              ...p,
              theatreId: newTheatreId, theatreName: theatre?.name || "", theatreCapacity: theatre?.total_seats || 0,
              bookingId: booking?.id || null, filmTitle: newFilmTitle, filmDay: newFilmDay, screenNo: booking?.screen_no || 1,
              distributorSharePct: Number(booking?.distributor_share_pct) || 50,
              bmsCommissionPct: Number(booking?.bms_commission_pct) || 8,
              districtCommissionPct: Number(booking?.district_commission_pct) || 5,
              firstShowTime: booking?.first_show_time ? String(booking.first_show_time).slice(0, 5) : "11:00",
              numShows: booking?.num_shows || 4, showGapMinutes: booking?.show_gap_minutes || 270,
              pricing: (prices || []).map((p: any) => ({ className: p.class_name, price: Number(p.price), pricePaise: Math.round(Number(p.price) * 100), snoFrom: p.sno_from, snoTo: p.sno_to, capacity: p.capacity })),
              loading: false, error: booking ? null : "No active booking for this theatre",
            }));
          })();
        },
        pricing,
        loading: false, error: null,
        refetch: fetchContext,
      });
    } catch (err) {
      setCtx((p) => ({
        ...p,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load user context",
        refetch: fetchContext,
      }));
    }
  }

  useEffect(() => {
    if (user?.id && role) fetchContext();
  }, [user?.id, role]);

  return ctx;
}
