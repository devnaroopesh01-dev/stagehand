"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Event, Seat } from "@/lib/types";
import SeatMap from "@/components/SeatMap";
import type { User } from "@supabase/supabase-js";

const MAX_SEATS = 4;
const HOLD_MINUTES = 5;

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const eventId = params.id;

  const [event, setEvent] = useState<Event | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookedSeatIds, setBookedSeatIds] = useState<Set<string>>(new Set());
  const [heldByOthersSeatIds, setHeldByOthersSeatIds] = useState<Set<string>>(new Set());
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Hold state: once seats are held, holdExpiresAt is set and a countdown runs.
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    const [{ data: eventData }, { data: seatData }, { data: userData }] =
      await Promise.all([
        supabase.from("events").select("*").eq("id", eventId).single(),
        supabase
          .from("seats")
          .select("*")
          .eq("event_id", eventId)
          .order("row_index")
          .order("col_index"),
        supabase.auth.getUser(),
      ]);

    setEvent(eventData as Event | null);
    setSeats((seatData as Seat[]) ?? []);
    setUser(userData.user);

    const { data: bookedRows } = await supabase
      .from("booking_seats")
      .select("seat_id, bookings!inner(event_id, status)")
      .eq("bookings.event_id", eventId)
      .eq("bookings.status", "confirmed");

    setBookedSeatIds(new Set((bookedRows ?? []).map((r: any) => r.seat_id)));

    // Seats held by ANYONE right now, minus whatever the current user is
    // already holding (those show as "selected" locally instead).
    const { data: holdRows } = await supabase
      .from("active_seat_holds")
      .select("seat_id")
      .eq("event_id", eventId);

    const myUserId = userData.user?.id;
    let mySelected = new Set<string>();
    if (myUserId) {
      const { data: myHolds } = await supabase
        .from("seat_holds")
        .select("seat_id, expires_at")
        .eq("event_id", eventId)
        .eq("user_id", myUserId)
        .gt("expires_at", new Date().toISOString());

      if (myHolds && myHolds.length > 0) {
        mySelected = new Set(myHolds.map((h: any) => h.seat_id));
        setSelectedSeatIds(mySelected);
        setHoldExpiresAt(new Date(myHolds[0].expires_at));
      }
    }

    const othersHeld = new Set<string>(
      (holdRows ?? [])
        .map((r: any) => r.seat_id as string)
        .filter((id: string) => !mySelected.has(id))
    );
    setHeldByOthersSeatIds(othersHeld);
    setLoading(false);
  }, [eventId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Countdown timer, ticks every second while a hold is active.
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!holdExpiresAt) {
      setSecondsLeft(null);
      return;
    }

    function tick() {
      const diff = Math.max(0, Math.floor((holdExpiresAt!.getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff <= 0) {
        clearInterval(timerRef.current!);
        setHoldExpiresAt(null);
        setSelectedSeatIds(new Set());
        setError("Your hold expired. Please select seats again.");
        loadData();
      }
    }

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [holdExpiresAt, loadData]);

  function toggleSeat(seat: Seat) {
    if (holdExpiresAt) return; // can't change selection while holding
    setError(null);
    setSuccess(null);
    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else {
        if (next.size >= MAX_SEATS) return prev;
        next.add(seat.id);
      }
      return next;
    });
  }

  async function handleHold() {
    if (!user) {
      router.push(`/login?next=/events/${eventId}`);
      return;
    }
    if (selectedSeatIds.size === 0) return;

    setHolding(true);
    setError(null);
    setSuccess(null);

    const { data: expiresAt, error: rpcError } = await supabase.rpc("hold_seats", {
      p_event_id: eventId,
      p_seat_ids: Array.from(selectedSeatIds),
    });

    setHolding(false);

    if (rpcError) {
      setError(rpcError.message);
      setSelectedSeatIds(new Set());
      await loadData();
      return;
    }

    setHoldExpiresAt(new Date(expiresAt as string));
  }

  async function handleCancelHold() {
    setBooking(false);
    await supabase.rpc("release_holds", { p_event_id: eventId });
    setHoldExpiresAt(null);
    setSelectedSeatIds(new Set());
    setError(null);
    setSuccess(null);
    await loadData();
  }

  async function handleConfirm() {
    if (!user || selectedSeatIds.size === 0) return;

    setBooking(true);
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc("book_seats", {
      p_event_id: eventId,
      p_seat_ids: Array.from(selectedSeatIds),
    });

    setBooking(false);

    if (rpcError) {
      setError(
        rpcError.message.includes("unique") || rpcError.message.includes("held")
          ? "One or more of those seats were just booked by someone else. Pick again."
          : rpcError.message
      );
      setSelectedSeatIds(new Set());
      setHoldExpiresAt(null);
      await loadData();
      return;
    }

    setSuccess("Booked! Find it under My Bookings.");
    setSelectedSeatIds(new Set());
    setHoldExpiresAt(null);
    await loadData();
  }

  if (loading) return <p className="text-muted">Loading event…</p>;
  if (!event) return <p className="text-muted">Event not found.</p>;

  const isOrganiser = user?.id === event.organiser_id;
  const eventDate = new Date(event.event_time);
  const isPast = eventDate.getTime() < Date.now();
  const vipRowThreshold = Math.max(event.rows - 2, 0);

  const selectedTotal = Array.from(selectedSeatIds).reduce((sum, id) => {
    const seat = seats.find((s) => s.id === id);
    if (!seat) return sum;
    const isVip = seat.row_index >= vipRowThreshold;
    return sum + (isVip ? event.ticket_price * 2 : event.ticket_price);
  }, 0);

  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="font-display text-3xl">{event.title}</h1>
          <p className="text-muted mt-1">
            {event.venue} ·{" "}
            {eventDate.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        {isOrganiser && (
          <Link
            href={`/events/${event.id}/organiser`}
            className="shrink-0 rounded-stub border border-line px-3 py-1.5 text-sm font-medium hover:bg-line/40 transition-colors"
          >
            Organiser view
          </Link>
        )}
      </div>

      {event.description && (
        <p className="text-ink/80 mb-6 max-w-2xl">{event.description}</p>
      )}

      <div className="border border-line rounded-stub p-6 bg-white">
        {isPast ? (
          <p className="text-center text-muted py-8">
            This event has already taken place.
          </p>
        ) : (
          <>
            <SeatMap
              seats={seats}
              bookedSeatIds={bookedSeatIds}
              heldByOthersSeatIds={heldByOthersSeatIds}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={toggleSeat}
              maxSelectable={MAX_SEATS}
              vipRowThreshold={vipRowThreshold}
              basePrice={event.ticket_price}
            />

            {holdExpiresAt && (
              <div className="mt-6 rounded-stub bg-seatHeld/20 border border-seatHeld px-4 py-2 text-center text-sm">
                Seats held for{" "}
                <span className="font-display font-semibold">
                  {mm}:{ss.toString().padStart(2, "0")}
                </span>{" "}
                — confirm before the hold expires.
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
              <div>
                <p className="text-sm text-muted">
                  {selectedSeatIds.size} of {MAX_SEATS} seats selected
                </p>
                <p className="font-display text-xl">₹{selectedTotal.toFixed(2)}</p>
              </div>

              <div className="flex items-center gap-3">
                {holdExpiresAt && (
                  <button
                    onClick={handleCancelHold}
                    className="rounded-stub border border-line px-4 py-2.5 text-sm font-medium hover:bg-line/40 transition-colors"
                  >
                    Release hold
                  </button>
                )}
                {!holdExpiresAt ? (
                  <button
                    onClick={handleHold}
                    disabled={selectedSeatIds.size === 0 || holding}
                    className="rounded-stub bg-mauve text-white px-6 py-2.5 font-medium hover:bg-mauveDark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {holding
                      ? "Holding…"
                      : user
                      ? `Hold for ${HOLD_MINUTES} min`
                      : "Log in to book"}
                  </button>
                ) : (
                  <button
                    onClick={handleConfirm}
                    disabled={booking}
                    className="rounded-stub bg-mauve text-white px-6 py-2.5 font-medium hover:bg-mauveDark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {booking ? "Booking…" : "Confirm booking"}
                  </button>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
            {success && <p className="text-sm text-seatAvailable mt-4">{success}</p>}
          </>
        )}
      </div>
    </div>
  );
}