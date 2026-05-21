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
  pricing: [], loading: true, error: null, refetch: () => {},
};

export function useUserContext(): UserContext {
  const { user, role, profile } = useAuth();
  const [ctx, setCtx] = useState<UserContext>(EMPTY);

  async function fetchContext() {
    if (!user?.id) return;

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
          pricing: [],
          loading: false, error: null,
          refetch: fetchContext,
        });
        return;
      }

      // 1. Find user's theatre (only for rep/manager)
      if (role === "rep") {
        // Get all theatres assigned to this rep
        const { data: reps } = await (supabase as any)
          .from("theatre_reps")
          .select("theatre_id")
          .eq("user_id", uid)
          .eq("is_active", true);
        
        if (reps?.length) {
          // Prefer theatre with active booking
          const today = new Date().toISOString().split("T")[0];
          for (const r of reps) {
            const { data: bk } = await (supabase as any)
              .from("theatre_bookings")
              .select("id")
              .eq("theatre_id", r.theatre_id)
              .eq("is_active", true)
              .lte("start_date", today)
              .limit(1);
            if (bk?.length) { theatreId = r.theatre_id; break; }
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
      if (theatreId) {
        const { data: theatre } = await (supabase as any)
          .from("theatres")
          .select("name, total_seats")
          .eq("id", theatreId)
          .single();
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

      if (theatreId) {
        const today = new Date().toISOString().split("T")[0];
        const { data: booking } = await (supabase as any)
          .from("theatre_bookings")
          .select("id, film_id, screen_no, start_date, distributor_share_pct, bms_commission_pct, district_commission_pct, first_show_time, num_shows, show_gap_minutes")
          .eq("theatre_id", theatreId)
          .eq("is_active", true)
          .lte("start_date", today)
          .order("start_date", { ascending: false })
          .limit(1)
          .single();

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
            .single();

          if (film) {
            filmTitle = film.title || "";
            const releaseDate = new Date(film.release_date);
            filmDay = Math.max(1, Math.ceil((Date.now() - releaseDate.getTime()) / 86400000) + 1);
          }
        }
      }

      // 4. Fetch pricing for this theatre
      let pricing: UserContext["pricing"] = [];
      if (theatreId) {
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
