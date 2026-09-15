"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";

type BookingWithDetails = {
  id: string;
  event_id: string;
  created_at: string;
  events: {
    id: string;
    title: string;
    venue: string;
    event_time: string;
  };
  booking_seats: { price: number; seats: { label: string } }[];
};

export default function MyBookingsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `id, event_id, created_at,
         events (id, title, venue, event_time),
         booking_seats ( price, seats ( label ) )`
      )
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });

    if (!error && data) setBookings(data as unknown as BookingWithDetails[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel(bookingId: string) {
    setCancellingId(bookingId);
    setMessage(null);

    const { error } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
    });

    setCancellingId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Booking cancelled.");
    load();
  }

  if (loading) return <p className="text-muted">Loading your bookings…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">My bookings</h1>

      {message && <p className="text-sm text-mauveDark mb-4">{message}</p>}

      {bookings.length === 0 && (
        <div className="border border-dashed border-line rounded-stub py-16 text-center">
          <p className="text-muted">No bookings yet.</p>
          <Link href="/events" className="text-mauveDark font-medium">
            Browse events
          </Link>
        </div>
      )}

      <div className="grid gap-4">
        {bookings.map((b) => {
          const seatLabels = b.booking_seats
            .map((bs) => bs.seats.label)
            .sort()
            .join(", ");
          const total = b.booking_seats.reduce((sum, bs) => sum + Number(bs.price), 0);
          const eventDate = new Date(b.events.event_time);
          const isPast = eventDate.getTime() < Date.now();
          const receiptUrl = origin ? `${origin}/receipt/${b.id}` : "";

          return (
            <div key={b.id} className="ticket-card items-stretch">
              <div className="stub">
                <span className="text-2xl font-display leading-none">
                  {eventDate.toLocaleDateString(undefined, { day: "2-digit" })}
                </span>
                <span className="text-xs tracking-wide mt-1">
                  {eventDate.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}
                </span>
              </div>
              <div className="perforation" />
              <div className="flex-1 p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/events/${b.events.id}`}
                    className="font-display text-lg hover:text-mauveDark truncate block"
                  >
                    {b.events.title}
                  </Link>
                  <p className="text-sm text-muted">{b.events.venue}</p>
                  <p className="text-sm text-muted mt-1">Seats: {seatLabels}</p>
                  <p className="text-sm text-muted">Total: ₹{total.toFixed(2)}</p>
                </div>
                <div className="shrink-0">
                  {isPast ? (
                    <span className="text-xs text-muted">Event has passed</span>
                  ) : (
                    <button
                      onClick={() => handleCancel(b.id)}
                      disabled={cancellingId === b.id}
                      className="rounded-stub border border-red-300 text-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                    >
                      {cancellingId === b.id ? "Cancelling…" : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
              {receiptUrl && (
                <Link
                  href={`/receipt/${b.id}`}
                  className="shrink-0 flex flex-col items-center justify-center gap-1 px-4 border-l border-dashed border-line hover:bg-cream/60 transition-colors"
                  title="Open receipt"
                >
                  <QRCodeSVG value={receiptUrl} size={56} fgColor="#3D2B3D" />
                  <span className="text-[10px] text-muted">Receipt</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}