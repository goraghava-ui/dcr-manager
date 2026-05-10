/**
 * Supabase Realtime Hooks
 * 
 * Subscribes to INSERT/UPDATE on cdrs and prd_settlements tables.
 * Manager dashboard gets live CDR submission notifications.
 * Distributor dashboard gets live collection updates across theatres.
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "./supabase";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type ChangeHandler = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

/** Subscribe to CDR changes for a specific theatre booking */
export function useCDRRealtime(
  bookingId: string | null,
  onInsert?: ChangeHandler,
  onUpdate?: ChangeHandler
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`cdrs:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cdrs",
          filter: `theatre_booking_id=eq.${bookingId}`,
        },
        (payload) => {
          onInsert?.(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cdrs",
          filter: `theatre_booking_id=eq.${bookingId}`,
        },
        (payload) => {
          onUpdate?.(payload);
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setConnected(false);
    };
  }, [bookingId]);

  return { connected };
}

/** Subscribe to settlement changes for a distributor */
export function useSettlementRealtime(
  onInsert?: ChangeHandler,
  onUpdate?: ChangeHandler
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("settlements:all")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "prd_settlements",
        },
        (payload) => onInsert?.(payload)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "prd_settlements",
        },
        (payload) => onUpdate?.(payload)
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, []);
}

/** Subscribe to expense changes for a theatre */
export function useExpenseRealtime(
  theatreId: string | null,
  onInsert?: ChangeHandler
) {
  useEffect(() => {
    if (!theatreId) return;

    const channel = supabase
      .channel(`expenses:${theatreId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "expenses",
          filter: `theatre_id=eq.${theatreId}`,
        },
        (payload) => onInsert?.(payload)
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [theatreId]);
}

/** Generic presence indicator — shows who's viewing a page */
export function usePresence(channelName: string, userId: string, userName: string) {
  const [viewers, setViewers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const channel = supabase.channel(channelName);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const active: Array<{ id: string; name: string }> = [];
        Object.values(state).forEach((presences) => {
          (presences as Array<Record<string, string>>).forEach((p) => {
            if (p.user_id !== userId) {
              active.push({ id: p.user_id, name: p.user_name });
            }
          });
        });
        setViewers(active);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            user_name: userName,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [channelName, userId, userName]);

  return viewers;
}
